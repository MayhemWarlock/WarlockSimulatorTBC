#ifndef WARLOCK_SIMULATOR_TBC_PLAYER_SETTINGS
#define WARLOCK_SIMULATOR_TBC_PLAYER_SETTINGS

#include <memory>

#include "auras.h"
#include "character_stats.h"
#include "items.h"
#include "sets.h"
#include "talents.h"

struct PlayerSettings {
  std::shared_ptr<Auras> auras;
  std::shared_ptr<Talents> talents;
  std::shared_ptr<Sets> sets;
  std::shared_ptr<CharacterStats> stats;
  std::shared_ptr<Items> items;
  int itemId;
  int metaGemId;
  bool equippedItemSimulation;
  bool recordingCombatLogBreakdown;
  bool simmingStamina;
  bool simmingIntellect;
  bool simmingSpirit;
  bool simmingSpellPower;
  bool simmingShadowPower;
  bool simmingFirePower;
  bool simmingHitRating;
  bool simmingCritRating;
  bool simmingHasteRating;
  bool simmingMp5;
  bool isAldor;
  int enemyLevel;
  int enemyShadowResist;
  int enemyFireResist;
  int mageAtieshAmount;
  int totemOfWrathAmount;
  bool sacrificingPet;
  bool petIsImp;
  bool petIsSuccubus;
  bool petIsFelguard;
  int ferociousInspirationAmount;
  int improvedCurseOfTheElements;
  bool usingCustomIsbUptime;
  int customIsbUptimeValue;
  int improvedDivineSpirit;
  int improvedImp;
  int shadowPriestDps;
  int warlockAtieshAmount;
  int improvedExposeArmor;
  bool isSingleTarget;
  int enemyAmount;
  bool isOrc;
  int powerInfusionAmount;
  int bloodlustAmount;
  int innervateAmount;
  int enemyArmor;
  int exposeWeaknessUptime;
  bool improvedFaerieFire;
  bool infinitePlayerMana;
  bool infinitePetMana;
  bool usingLashOfPainOnCooldown;
  bool petIsAggressive;
  bool prepopBlackBook;
  bool randomizeValues;
  bool simChoosingRotation;
  bool exaltedWithShattrathFaction;
  int survivalHunterAgility;
  bool hasImmolate;
  bool hasCorruption;
  bool hasSiphonLife;
  bool hasUnstableAffliction;
  bool hasSearingPain;
  bool hasShadowBolt;
  bool hasIncinerate;
  bool hasCurseOfRecklessness;
  bool hasCurseOfTheElements;
  bool hasCurseOfAgony;
  bool hasCurseOfDoom;
  bool hasDeathCoil;
  bool hasShadowburn;
  bool hasConflagrate;
  bool hasShadowfury;
  bool hasAmplifyCurse;
  bool hasDarkPact;
  bool hasElementalShamanT4Bonus;
};

#endif