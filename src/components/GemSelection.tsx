import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux"
import { canGemColorBeInsertedIntoSocketColor, getBaseWowheadUrl, getGemsStats } from "../Common";
import { Gems } from "../data/Gems";
import { Items } from "../data/Items";
import i18n from "../i18n/config";
import { setGemsStats, setSelectedGems } from "../redux/PlayerSlice";
import { RootState } from "../redux/Store"
import { favoriteGem, hideGem, setGemSelectionTable } from "../redux/UiSlice";
import { Gem, InitialGemSelectionTableValue } from "../Types";

export default function GemSelection() {
  const uiState = useSelector((state: RootState) => state.ui);
  const selectedGemsState = useSelector((state: RootState) => state.player.selectedGems);
  const selectedItemsState = useSelector((state: RootState) => state.player.selectedItems);
  const dispatch = useDispatch();
  const [showingHiddenGems, setShowingHiddenGems] = useState(false);
  const { t } = useTranslation();

  function gemClickHandler(gem: Gem) {
    let newSelectedGems = JSON.parse(JSON.stringify(selectedGemsState));
    let selectedGemsInItemSlot = newSelectedGems[uiState.gemSelectionTable.itemSlot] || {};

    // If the item doesn't have a socket array yet then initialize it to an array of ['', 0] sub-arrays.
    // The first element is the socket color (not gem color) and the second element is the gem id.
    let currentItemSocketArray = selectedGemsInItemSlot[uiState.gemSelectionTable.itemId];
    if (currentItemSocketArray == null) {
      const itemSocketAmount = Items
        .find(i => i.id === parseInt(uiState.gemSelectionTable.itemId))?.sockets?.length;
      currentItemSocketArray = Array(itemSocketAmount).fill(['', 0]);
    } else {
      currentItemSocketArray = JSON.parse(JSON.stringify(currentItemSocketArray));

      // Return if the clicked gem is the same as the already equipped gem
      if (currentItemSocketArray[uiState.gemSelectionTable.socketNumber] &&
        currentItemSocketArray[uiState.gemSelectionTable.socketNumber][1] === gem.id) {
        return;
      }
    }

    currentItemSocketArray[uiState.gemSelectionTable.socketNumber] = [uiState.gemSelectionTable.socketColor, gem.id];
    newSelectedGems[uiState.gemSelectionTable.itemSlot] = newSelectedGems[uiState.gemSelectionTable.itemSlot] || {};
    newSelectedGems[uiState.gemSelectionTable.itemSlot][uiState.gemSelectionTable.itemId] = currentItemSocketArray;
    dispatch(setSelectedGems(newSelectedGems));
    dispatch(setGemsStats(getGemsStats(selectedItemsState, newSelectedGems)));
  }

  return (
    <table
      id="gem-selection-table"
      cellSpacing={0}
      data-color='none'
      style={{ display: uiState.gemSelectionTable.visible ? '' : 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      <tbody>
        <tr>
          <td></td>
          <td
            id='show-hidden-gems-button'
            onClick={(e) => setShowingHiddenGems(!showingHiddenGems)}
            style={{ display: uiState.gemPreferences.hidden.length === 0 ? 'none' : '' }}
          >
            {(showingHiddenGems ? 'Hide' : 'Show') + ' Hidden Gems'}
          </td>
        </tr>
        {
          Gems
            .filter(gem =>
              canGemColorBeInsertedIntoSocketColor(uiState.gemSelectionTable.socketColor, gem.color) &&
              Object.entries(uiState.sources.phase).some(p => parseInt(p[0]) >= gem.phase && p[1] === true))
            .sort(function (a, b) {
              return Number(uiState.gemPreferences.favorites.includes(b.id)) -
                Number(uiState.gemPreferences.favorites.includes(a.id));
            })
            .map(gem =>
              <tr
                key={gem.id}
                className='gem-row'
                data-hidden={false}
                style={{
                  display: uiState.gemPreferences.hidden.includes(gem.id) && !showingHiddenGems ? 'none' : ''
                }}
              >
                <td
                  className='gem-info gem-favorite-star'
                  title={uiState.gemPreferences.favorites.includes(gem.id) ?
                    'Remove gem from favorites' : 'Add gem to favorites'}
                  data-favorited={uiState.gemPreferences.favorites.includes(gem.id)}
                  onClick={(e) => dispatch(favoriteGem(gem.id))}
                >★</td>
                <td
                  className='gem-info gem-name'
                  onClick={(e) => {
                    gemClickHandler(gem); dispatch(setGemSelectionTable(InitialGemSelectionTableValue));
                    e.preventDefault();
                  }}
                >
                  <img
                    src={`${process.env.PUBLIC_URL}/img/${gem.iconName}.jpg`}
                    alt={t(gem.name)}
                    width={20}
                    height={20}
                  />
                  <a href={`${getBaseWowheadUrl(i18n.language)}/item=${gem.id}`}>{t(gem.name)}</a>
                </td>
                <td
                  className='gem-info gem-hide'
                  title={uiState.gemPreferences.hidden.includes(gem.id) ? 'Show Gem' : 'Hide Gem'}
                  data-hidden={uiState.gemPreferences.hidden.includes(gem.id)}
                  onClick={(e) => dispatch(hideGem(gem.id))}
                >❌</td>
              </tr>
            )
        }
      </tbody>
    </table>
  )
}