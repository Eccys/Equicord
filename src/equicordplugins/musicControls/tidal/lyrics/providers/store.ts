/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { settings } from "@equicordplugins/musicControls/settings";
import { getLyrics } from "@equicordplugins/musicControls/tidal/lyrics/api";
import { EnhancedLyric } from "@equicordplugins/musicControls/tidal/lyrics/types";
import { TidalStore } from "@equicordplugins/musicControls/tidal/TidalStore";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

function showNotif(title: string, body: string) {
    if (settings.store.showFailedToasts) {
        showNotification({
            color: "#ee2902",
            title,
            body,
            noPersist: true
        });
    }
}

let tidalStoreChangeListener: (() => void) | undefined;
let tidalStoreListenerAttached = false;

export const TidalLrcStore = proxyLazyWebpack(() => {
    let lyrics: EnhancedLyric[] | null = null;
    let lastTrackId: string | null = null;

    class TidalLrcStore extends Flux.Store {
        init() { }
        get lyrics() {
            return lyrics;
        }
    }

    const store = new TidalLrcStore(FluxDispatcher);
    function handleTidalStoreChange() {
        const { track } = TidalStore;
        if (!track?.id || lastTrackId === track.id) return;
        lastTrackId = track.id;
        getLyrics(track)
            .then(l => { lyrics = l; store.emitChange(); })
            .catch(() => {
                lyrics = null;
                showNotif("Tidal Lyrics", "Failed to fetch lyrics");
                store.emitChange();
            });
    }

    TidalStore.addChangeListener(handleTidalStoreChange);
    tidalStoreChangeListener = handleTidalStoreChange;
    tidalStoreListenerAttached = true;

    return store;
});

export function startTidalLrcStore() {
    if (tidalStoreChangeListener && !tidalStoreListenerAttached) {
        TidalStore.addChangeListener(tidalStoreChangeListener);
        tidalStoreListenerAttached = true;
    }
}

export function stopTidalLrcStore() {
    if (tidalStoreChangeListener && tidalStoreListenerAttached) {
        TidalStore.removeChangeListener(tidalStoreChangeListener);
        tidalStoreListenerAttached = false;
    }
}
