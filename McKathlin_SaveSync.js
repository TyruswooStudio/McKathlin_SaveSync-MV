//=============================================================================
// Save Sync
// by McKathlin
// McKathlin_SaveFinder.js
//=============================================================================

/*
 * MIT License
 *
 * Copyright (c) 2024 Kathy Bunn and Scott Tyrus Washburn
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var Imported = Imported || {};
Imported.McKathlin_SaveSync = true;

var McKathlin = McKathlin || {};
McKathlin.SaveSync = {};

/*:
 * @plugindesc MV 1.0.0 Restores missing global save info
 * @author McKathlin
 * 
 * @help Save Sync for RPG Maker MV
 * 
 * Sometimes when Steam Cloud updates people's save files, or when a
 * player pastes in a savefile from a backup, the save files actually present
 * in their game may fall out of sync with the list in global.rpgsave that
 * RPG Maker MV's runtime uses to populate the Load Menu. This can leave the
 * player unable to access their existing saves.
 * 
 * When this Save Sync plugin is active, it resolves any inconsistencies
 * between which savefiles are actually present and which saves are recorded
 * in global.rpgsave.
 * 
 * ============================================================================
 * Compatibility Note
 * 
 * This plugin does not have any known conflicts with existing plugins.
 * If another plugin were to modify DataManager.loadGlobalInfo, this would
 * cause a conflict. Barring that, you may place McKathlin_SaveSync anywhere
 * on your game's plugin list.
 * 
 * ============================================================================
 * MIT License
 *
 * Copyright (c) 2023 Kathy Bunn and Scott Tyrus Washburn
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the “Software”), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 * ============================================================================
 * Happy storytelling!
 * -McKathlin
 */

// Alias method
McKathlin.SaveSync.DataManager_saveGlobalInfo = DataManager.saveGlobalInfo;
DataManager.saveGlobalInfo = function(info) {
    this._globalInfo = info; // Update the cache.
    McKathlin.SaveSync.DataManager_saveGlobalInfo.call(this, info);
};

// Replacement method
DataManager.loadGlobalInfo = function() {
    if (this._globalInfo) {
        // It's cached. No need to load from storage this time.
        return this._globalInfo;
    }

    // Try loading it from storage.
    let globalInfo;
    try {
        let json = StorageManager.load(0);
        if (!json) {
            throw new Error("Global info file not found");
        }
        globalInfo = JSON.parse(json);
    } catch (e) {
        console.error("Failed to load global save info:", e);
        globalInfo = [];
    }

    // Update to match which savefiles are actually present.
    let infoUpdated = false;
    for (var i = 1; i <= this.maxSavefiles(); i++) {
        if (StorageManager.exists(i)) {
            // There *should* be save info here. If not, make one!
            if (!globalInfo[i]) {
                globalInfo[i] = McKathlin.SaveSync.makeMissingSaveInfo(i);
                infoUpdated = true;
            }
        } else {
            // There should *not* be save info here. If there is, delete it.
            if (globalInfo[i]) {
                delete globalInfo[i];
                infoUpdated = true;
            }
        }
    }

    this._globalInfo = globalInfo; // This caches it for easier reference.
    if (infoUpdated) {
        this.saveGlobalInfo(this._globalInfo);
    }
    return this._globalInfo;
};

// New method
McKathlin.SaveSync.makeMissingSaveInfo = function(savefileId) {
    console.warn(`File ${savefileId} has no global save info.\n Restoring the info...`);

    // Start with a dummy info object.
    let info = {
        globalId: DataManager._globalId,
        title: $dataSystem.gameTitle,
        characters: [],
        faces: [],
        playtime: "??:??:??",
        timestamp: Date.now(),
    };

    try {
        // Load the game to generate its save info.
        let json = StorageManager.load(savefileId);
        let saveContents = JsonEx.parse(json);

        // Extract save-specific data
        info.characters = McKathlin.SaveSync.extractCharacters(saveContents);
        info.faces = McKathlin.SaveSync.extractFaces(saveContents);
        info.playtime = McKathlin.SaveSync.extractPlaytime(saveContents);

        console.log(`File ${savefileId}'s info has been restored successfully.`);
        return info;
    } catch (err) {
        console.error(`Failed to restore some of File ${savefileId}'s save info:`, err);
        console.warn(`You can still try loading File ${savefileId}.`);
    }
    return info;
};

McKathlin.SaveSync.extractCharacters = function(saveContents) {
    const members = this.extractPartyMembers(saveContents);
    return members.map((actor) =>
        [actor.characterName(), actor.characterIndex()]);
};

McKathlin.SaveSync.extractFaces = function(saveContents) {
    const members = this.extractPartyMembers(saveContents);
    return members.map((actor) => [actor.faceName(), actor.faceIndex()]);
};

McKathlin.SaveSync.extractPlaytime = function(saveContents) {
    const frames = saveContents.system._framesOnSave;
    const totalSeconds = Math.floor(frames / 60);

    const hour = Math.floor(totalSeconds / 60 / 60);
    const min = Math.floor(totalSeconds / 60) % 60;
    const sec = totalSeconds % 60;

    return `${hour.padZero(2)}:${min.padZero(2)}:${sec.padZero(2)}`;
};

McKathlin.SaveSync.extractPartyMembers = function(saveContents) {
    // Get the IDs of the active party members.
    const maxActive = saveContents.party.maxBattleMembers();
    const memberIds = saveContents.party._actors.slice(0, maxActive);
    
    // Return the actors with those IDs.
    const gameActors = saveContents.actors;
    const members = memberIds.map((id) => gameActors.actor(id));
    return members;
};
