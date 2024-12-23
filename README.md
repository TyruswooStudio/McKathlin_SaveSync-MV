# McKathlin Save Sync Plugin for RPG Maker MV

This plugin allows RPG Maker MV games to retain access to existing savefiles
if global info is missing.

Sometimes when Steam Cloud updates people's save files, or when a
player pastes in a savefile from a backup, the save files actually present
in their game may fall out of sync with the list in global.rpgsave that
RPG Maker MV's runtime uses to populate the Load Menu. This can leave the
player unable to access their existing saves.

When this Save Sync plugin is active, it resolves any inconsistencies
between which savefiles are actually present and which saves are recorded
in global.rpgsave.

## Compatiblity Note

This plugin does not have any known conflicts with existing plugins.
If another plugin were to modify DataManager.loadGlobalInfo, this would
cause a conflict. Barring that, you may place McKathlin_SaveSync anywhere
on your game's plugin list.

### Visit [**Tyruswoo.com**](https://www.tyruswoo.com) to [ask for help](https://www.tyruswoo.com/contact-us/), [donate](https://www.tyruswoo.com/donate/), or browse more of our [plugins](https://www.tyruswoo.com/downloads/rpg-maker-plugin-downloads/).

## Version History

**v1.0.0** - Dec 23, 2024
- Initial release of McKathlin Save Sync.
