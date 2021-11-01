import { useState } from "react";
import { useDispatch, useSelector } from "react-redux"
import { average, getItemTableItems, getStdev, itemMeetsSocketRequirements, ItemSlotKeyToItemSlot } from "../Common";
import { Gems } from "../data/Gems";
import { Items } from "../data/Items";
import { RootState } from "../redux/Store"
import { clearSavedItemSlotDps, setCombatLogBreakdownValue, setCombatLogData, setCombatLogVisibility, setSavedItemDps } from "../redux/UiSlice";
import { SimWorker } from "../SimWorker.js";
import { CombatLogBreakdownData, GemColor, ItemSlot, SimulationType, Stat, WorkerParams } from "../Types";

interface SimulationUpdate {
  medianDps: number,
  iteration: number,
  iterationAmount: number,
  itemId: number,
  customStat: Stat
}

interface SimulationEnd {
  customStat: string,
  itemId: number,
  iterationAmount: number,
  totalDuration: number,
  maxDps:  number,
  minDps: number,
  medianDps: number
}

export function SidebarButtons() {
  const playerState = useSelector((state: RootState) => state.player);
  const uiState = useSelector((state: RootState) => state.ui);
  const dispatch = useDispatch();
  const [medianDps, setMedianDps] = useState(localStorage.getItem('medianDps') || '');
  const [minDps, setMinDps] = useState(localStorage.getItem('minDps') || '');
  const [maxDps, setMaxDps] = useState(localStorage.getItem('maxDps') || '');
  const [simulationDuration, setSimulationDuration] = useState(localStorage.getItem('simulationDuration') || '');
  const [simulationProgressPercent, setSimulationProgressPercent] = useState(0);
  const [simulationInProgress, setSimulationInProgress] = useState(false);
  const [dpsStdev, setDpsStdev] = useState('');
  const [simulationType, setSimulationType] = useState<SimulationType>(SimulationType.Normal);
  let combatLogEntries: string[] = [];

  function getWorkerParams(itemId: number, equippedItemSimulation: boolean, simType: SimulationType): WorkerParams {
    let params: WorkerParams = {
      playerSettings: {
        auras: playerState.auras,
        items: JSON.parse(JSON.stringify(playerState.selectedItems)),
        enchants: playerState.selectedEnchants,
        gems: playerState.selectedGems,
        talents: playerState.talents,
        rotation: playerState.rotation,
        stats: JSON.parse(JSON.stringify(playerState.stats)),
        sets: JSON.parse(JSON.stringify(playerState.sets)),
        simSettings: playerState.settings,
        metaGemId: 0,
      },
      simulationSettings: {
        iterations: parseInt(playerState.settings.iterations),
        minTime: parseInt(playerState.settings["min-fight-length"]),
        maxTime: parseInt(playerState.settings['max-fight-length'])
      },
      itemId: itemId,
      simulationType: simType,
      itemSubSlot: uiState.selectedItemSubSlot,
      customStat: "normal",
      equippedItemSimulation: equippedItemSimulation,
    }
    let equippedMetaGemId = -1;
    let customItemMetaGemId = -1;

    // Get the equipped meta gem id
    if (params.playerSettings.items.head !== 0 && params.playerSettings.gems.head[params.playerSettings.items.head]) {
      params.playerSettings.gems.head[params.playerSettings.items.head].forEach(gemArray => {
        const gem = Gems.find(e => e.id === gemArray[1]);
        if (gem && gem.color === GemColor.Meta) {
          equippedMetaGemId = gem.id;
        }
      });
    }

    // Check if the parameter item is not the equipped item. If so then unequip the equipped item.
    const equippedItemId = params.playerSettings.items[ItemSlotKeyToItemSlot(false, uiState.selectedItemSlot, uiState.selectedItemSubSlot)];
    params.equippedItemSimulation = itemId === equippedItemId;
    const equippedItem = Items.find(e => e.id === equippedItemId);
    if (equippedItem && equippedItemId !== itemId) {
      // Remove item stats
      for (const [stat, value] of Object.entries(equippedItem)) {
        if (params.playerSettings.stats.hasOwnProperty(stat)) {
          //params.playerSettings.stats[stat as Stat] -= value;
        }
      }

      // Remove stats from socket bonus if it's active
      if (itemMeetsSocketRequirements({itemId: equippedItem.id, selectedGems: params.playerSettings.gems}) && equippedItem.socketBonus) {
        for (const [stat, value] of Object.entries(equippedItem.socketBonus)) {
          //params.playerSettings.stats[stat as Stat] -= value;
        }
      }

      // Lower the item set counter by 1 if the item is part of a set
      if (equippedItem.setId && params.playerSettings.sets[equippedItem.setId] && params.playerSettings.sets[equippedItem.setId] > 0) {
        params.playerSettings.sets[equippedItem.setId] -= 1;
      }
    }

    // Equip the new item if it's not the same as the equipped item.
    const customItem = Items.find(e => e.id === itemId);
    if (customItem && itemId !== equippedItemId) {
      // Add stats from new item
      for (const [stat, value] of Object.entries(itemId)) {
        if (params.playerSettings.stats.hasOwnProperty(stat)) {
          //params.playerSettings.stats[stat as Stat] -= value;
        }
      }

      // Socket bonus
      if (itemMeetsSocketRequirements({itemId: itemId, selectedGems: params.playerSettings.gems})) {
        for (const [stat, value] of Object.entries(customItem.socketBonus!)) {
          //params.playerSettings.stats[stat as Stat] -= value;
        }
      }

      // Increment set id counter
      if (customItem.setId) {
        params.playerSettings.sets[customItem.setId] += 1;
      }
    }

    return params;
  }

  function simulate(itemIdsToSim: number[], type: SimulationType) {
    if (simulationInProgress) { return; }
    const maxWorkers = window.navigator.hardwareConcurrency || 8; // Maximum amount of web workers that can be run concurrently.
    const simulations: SimWorker[] = [];
    const itemSlot: ItemSlot = ItemSlotKeyToItemSlot(false, uiState.selectedItemSlot, uiState.selectedItemSubSlot);
    const equippedItemId = playerState.selectedItems[itemSlot];
    let simulationsFinished = 0;
    let simulationsRunning = 0;
    let simIndex = 0;
    let dpsArray: number[] = [];
    let dpsCount: {[key: string]: number} = {};
    let combatLogBreakdownArr: CombatLogBreakdownData[] = [];
    let totalManaRegenerated = 0;
    let totalDamageDone = 0;
    let spellDamageDict: {[key: string]: number} = {};
    let spellManaGainDict: {[key: string]: number} = {};
    // Used to keep track of the progress % of sims for the progress bar.
    let simulationProgressPercentages: {itemId: number, progressPercent: number}[] = [];
    combatLogEntries = [];
    setSimulationInProgress(true);
    setSimulationType(type);
    if (type === SimulationType.AllItems) {
      dispatch(clearSavedItemSlotDps(itemSlot));
    }

    try {
      itemIdsToSim.forEach(itemId => {
        simulationProgressPercentages.push({itemId: itemId, progressPercent: 0});
        simulations.push(new SimWorker(
          (dpsUpdate: {dps: number}) => {
            dpsArray.push(dpsUpdate.dps);
            const dps: string = Math.round(dpsUpdate.dps).toString();
            dpsCount[dps] = Math.round(dpsCount[dps]) + 1 || 1;
          },
          (combatLogVector: { name: string, damage: number, manaGain: number }) => {
            spellDamageDict[combatLogVector.name] = spellDamageDict[combatLogVector.name] + combatLogVector.damage || combatLogVector.damage;
            spellManaGainDict[combatLogVector.name] = spellManaGainDict[combatLogVector.name] + combatLogVector.manaGain || combatLogVector.manaGain;
            totalManaRegenerated += combatLogVector.manaGain;
            totalDamageDone += combatLogVector.damage;
          },
          (errorCallback: {errorMsg: string}) => {
            populateCombatLog();
            errorCallbackHandler(errorCallback);
          },
          (combatLogUpdate: {combatLogEntry: string}) => {
            combatLogEntries.push(combatLogUpdate.combatLogEntry);
          },
          (combatLogBreakdown: CombatLogBreakdownData) => {
            combatLogBreakdownArr.push(combatLogBreakdown);
          },
          (params: SimulationEnd) => {
            const newMinDps = Math.round(params.minDps * 100) / 100;
            const newMaxDps = Math.round(params.maxDps * 100) / 100;
            const newMedianDps = Math.round(params.medianDps * 100) / 100;
            simulationsFinished++;
            simulationProgressPercentages.find(e => e.itemId === params.itemId)!.progressPercent = 100;
  
            // Callback for the currently equipped item
            if (type === SimulationType.Normal || params.itemId === equippedItemId) {
              console.log('item amount: ' + itemIdsToSim.length);
              console.log('simulationType: ' + type);
              setNewMedianDps(newMedianDps.toString(), true);
              setNewMinDps(newMinDps.toString(), true);
              setNewMaxDps(newMaxDps.toString(), true);
            }
  
            // All simulations finished
            if (simulationsFinished === itemIdsToSim.length) {
              setSimulationInProgress(false);
              const totalSimDuration = (performance.now() - startTime) / 1000;
              setNewSimulationDuration((Math.round(totalSimDuration * 10000) / 10000).toString(), true);
              populateCombatLog();
              setDpsStdev(Math.round(getStdev(dpsArray)).toString());
              setSimulationProgressPercent(0);
              
              if (type === SimulationType.Normal && playerState.settings["automatically-open-sim-details"] === 'yes') {
                dispatch(setCombatLogBreakdownValue({
                  totalDamageDone: totalDamageDone,
                  totalManaGained: totalManaRegenerated,
                  totalSimulationFightLength: params.totalDuration,
                  totalIterationAmount: params.iterationAmount,
                  spellDamageDict: spellDamageDict,
                  spellManaGainDict: spellManaGainDict,
                  data: combatLogBreakdownArr,
                }));
                $('.breakdown-table').trigger('update');
              }
            }
  
            // Start a new simulation that's waiting in the queue if there are any remaining
            if (simulationsRunning - simulationsFinished < maxWorkers && simIndex < simulations.length) {
              simulations[simIndex++].start();
              simulationsRunning++;
            }
  
            setSavedItemDpsValue(itemSlot, params.itemId, newMedianDps, true);
          },
          (params: SimulationUpdate) => {
            let newMedianDps = Math.round(params.medianDps * 100) / 100;
            const simProgressPercent = Math.ceil((params.iteration / params.iterationAmount) * 100);
            simulationProgressPercentages.find(e => e.itemId === params.itemId)!.progressPercent = simProgressPercent;
            setSimulationProgressPercent(Math.round(average(simulationProgressPercentages.map(e => e.progressPercent))));
            // Only update the item table dps value for every 10% of progress because otherwise the simulation slows down too much.
            if (type === SimulationType.Normal || (type === SimulationType.AllItems && simProgressPercent % 10 === 0)) {
              const domElement = document.getElementById(params.itemId.toString());
              if (domElement) {
                domElement.innerHTML = newMedianDps.toString();
                $('#item-selection-table').trigger('update');
              }
            }
            if (type === SimulationType.Normal || params.itemId ===  equippedItemId) {
              setNewMedianDps(newMedianDps.toString(), false);
            }
          },
          getWorkerParams(itemId, itemId === equippedItemId, type)
        ));
      });
  
      const startTime = performance.now();
      while (simulationsRunning < maxWorkers && simIndex < simulations.length) {
        simulations[simIndex++].start();
        simulationsRunning++;
      }
    } catch(error) {
      setSimulationInProgress(false);
      throw new Error("Error when trying to run simulation. " + error);
    }
  }

  function setSavedItemDpsValue(itemSlot: ItemSlot, itemId: number, newMedianDps: number, saveToLocalStorage: boolean): void {
    dispatch(setSavedItemDps({ itemSlot: itemSlot, itemId: itemId, dps: newMedianDps, saveLocalStorage: saveToLocalStorage }));
    $('#item-selection-table').trigger('update');
  }

  function populateCombatLog(): void {
    dispatch(setCombatLogData(combatLogEntries));
  }

  function errorCallbackHandler(errorCallback: {errorMsg: string}): void {
    alert("Error: " + errorCallback.errorMsg + "\nPost in #tbc-sim-report on the TBC Warlock Discord or contact Kristofer#8003 on Discord.");
  }

  function setNewMedianDps(newMedianDps: string, savingLocalStorage: boolean) {
    setMedianDps(newMedianDps);
    if (savingLocalStorage) {
      localStorage.setItem('medianDps', newMedianDps);
    }
  }

  function setNewMinDps(newMinDps: string, savingLocalStorage: boolean) {
    setMinDps(newMinDps);
    if (savingLocalStorage) {
      localStorage.setItem('minDps', newMinDps);
    }
  }

  function setNewMaxDps(newMaxDps: string, savingLocalStorage: boolean) {
    setMaxDps(newMaxDps);
    if (savingLocalStorage) {
      localStorage.setItem('maxDps', newMaxDps);
    }
  }

  function setNewSimulationDuration(newSimulationDuration: string, savingLocalStorage: boolean) {
    setSimulationDuration(newSimulationDuration);
    if (savingLocalStorage) {
      localStorage.setItem('simulationDuration', newSimulationDuration);
    }
  }

  return(
    <>
      {
        medianDps.length > 0 &&
          <div id="sim-result-dps-div">
            <p><span id="avg-dps">{medianDps}</span><span> DPS</span> <span id="dps-stdev">{dpsStdev.length > 0 ? '±' + dpsStdev : ''}</span></p>
            {
              maxDps.length > 0 && minDps.length > 0 &&
                <p>Min: <span id="min-dps">{minDps}</span> Max: <span id="max-dps">{maxDps}</span></p>
            }
          </div>
      }
      <div
        className='btn'
        onClick={() => simulate([Items.find(e => e.id === playerState.selectedItems[ItemSlotKeyToItemSlot(false, uiState.selectedItemSlot, uiState.selectedItemSubSlot)])?.id || 0], SimulationType.Normal)}
        style={{background: simulationInProgress && simulationType === SimulationType.Normal ? `linear-gradient(to right, #9482C9 ${simulationProgressPercent}%, transparent ${simulationProgressPercent}%)` : ''}}
      >{simulationInProgress && simulationType === SimulationType.Normal ? `${simulationProgressPercent}%` : 'Simulate'}</div>
      <div
        className='btn'
        onClick={() => simulate(getItemTableItems(uiState.selectedItemSlot, uiState.selectedItemSubSlot, playerState.selectedItems, uiState.sources, uiState.hiddenItems, false).map(item => item.id), SimulationType.AllItems)}
        style={{background: simulationInProgress && simulationType === SimulationType.AllItems ? `linear-gradient(to right, #9482C9 ${simulationProgressPercent}%, transparent ${simulationProgressPercent}%)` : ''}}
      >{simulationInProgress && simulationType === SimulationType.AllItems ? `${simulationProgressPercent}%` : 'Simulate All Items'}</div>
      <div className='btn'>Stat Weights</div>
      {
        uiState.combatLog.data.length > 0 &&
          <div className='btn' onClick={() => dispatch(setCombatLogVisibility(!uiState.combatLog.visible))}>Combat Log</div>
      }
      <div className='btn'>Histogram</div>
      <p id="sim-length-result">{simulationDuration}s</p>
    </>
  )
}