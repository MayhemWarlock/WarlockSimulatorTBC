import { nanoid } from "@reduxjs/toolkit";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { getBaseWowheadUrl, ItemSlotToItemSlotKey } from "../Common";
import { Enchants } from "../data/Enchants";
import { Items } from "../data/Items";
import i18n from "../i18n/config";
import { RootState } from "../redux/Store";
import { setEquippedItemsWindowVisibility } from "../redux/UiSlice";
import { Enchant, Item, ItemSlot } from "../Types";
import ItemSocketDisplay from "./ItemSocketDisplay";

function formatItemSlotName(itemSlot: ItemSlot): string {
  let formattedItemSlot = itemSlot as string;

  // Check if the last char is '1' or '2', if so then it's an item slot with sub-item slots so we put a space between the name and the sub-item slot value.
  const subItemSlotIndex = formattedItemSlot.length - 1;
  if (['1','2'].includes(formattedItemSlot.charAt(subItemSlotIndex))) {
    formattedItemSlot = formattedItemSlot.substring(0, subItemSlotIndex) + ' ' + formattedItemSlot.substring(subItemSlotIndex);
  }

  return formattedItemSlot.charAt(0).toUpperCase() + formattedItemSlot.slice(1);
}

export default function EquippedItemsDisplay() {
  const uiState = useSelector((state: RootState) => state.ui);
  const playerState = useSelector((state: RootState) => state.player);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  function getEnchantInItemSlot(itemSlot: ItemSlot): Enchant | undefined {
    let slot = itemSlot;

    if (slot === ItemSlot.twohand) {
      slot = ItemSlot.mainhand;
    }

    return Enchants.find(e => e.id === playerState.selectedEnchants[slot]);
  }

  function getItemInItemSlot(itemSlot: ItemSlot): Item | undefined {
    return Items.find(e => e.id === playerState.selectedItems[itemSlot]);
  }

  return(
    <div id="currently-equipped-items-container" style={{display: uiState.equippedItemsWindowVisible ? '' : 'none'}}>
      <div id="currently-equipped-items">
        <div onClick={(e) => dispatch(setEquippedItemsWindowVisibility(false))}>
          <a href='#' className='close' id='currently-equipped-items-close-button'></a>
        </div>
        <table>
          <colgroup>
            <col style={{width: '13%'}} />
            <col style={{width: '45%'}} />
            <col style={{width: '10%'}} />
            <col style={{width: '32%'}} />
          </colgroup>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Name</th>
              <th></th>
              <th>Enchant</th>
            </tr>
          </thead>
          <tbody>
            {
              Object.values(ItemSlot)
                // Filter for choosing whether to display mainhand + offhand or twohand. If a two hand is equipped then it shows two hand, otherwise it shows the mainhand + offhand
                .filter(slot => (![ItemSlot.mainhand, ItemSlot.offhand, ItemSlot.twohand].includes(slot) || (([ItemSlot.mainhand, ItemSlot.offhand].includes(slot) && (!playerState.selectedItems[ItemSlot.twohand] || playerState.selectedItems[ItemSlot.twohand] === 0)) || (slot === ItemSlot.twohand && (!playerState.selectedItems[ItemSlot.mainhand] || playerState.selectedItems[ItemSlot.mainhand] === 0) && (!playerState.selectedItems[ItemSlot.offhand] || playerState.selectedItems[ItemSlot.offhand] === 0)))))
                .map(slot =>
                  <tr key={nanoid()} className='equipped-item-row'>
                    <td>{t(formatItemSlotName(slot))}</td>
                    <td className={'equipped-item-name ' + (playerState.selectedItems[slot] != null ? getItemInItemSlot(slot)?.quality : '')}>
                      {
                        getItemInItemSlot(slot) &&
                          <>
                            <a
                              href={`${getBaseWowheadUrl(i18n.language)}/item=${(getItemInItemSlot(slot)!.displayId || getItemInItemSlot(slot)!.id)}`}
                              onClick={(e) => e.preventDefault()}
                            ></a>
                            {getItemInItemSlot(slot) ? t(getItemInItemSlot(slot)!.name) : ''}
                          </>
                      }
                    </td>
                    <td>
                      {
                        (playerState.selectedItems[slot] && getItemInItemSlot(slot) !== undefined) ?
                          <ItemSocketDisplay
                            item={getItemInItemSlot(slot)!}
                            itemSlot={ItemSlotToItemSlotKey(false, slot)} />
                        : ''
                      }
                    </td>
                    <td className={'equipped-item-enchant-name ' + (getEnchantInItemSlot(slot) !== undefined ? getEnchantInItemSlot(slot)?.quality : '')}>
                      {
                        getEnchantInItemSlot(slot) !== undefined &&
                        <>
                          <a
                            href={`${getBaseWowheadUrl(i18n.language)}/spell=${(getEnchantInItemSlot(slot)!.id)}`}
                            onClick={(e) => e.preventDefault()}
                          ></a>
                          {t(getEnchantInItemSlot(slot)!.name)}
                        </>
                      }
                    </td>
                  </tr>
              )
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}