/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, UserSettingsActionCreators } from "@webpack/common";

function generateSearchResults(query) {
    const guildAndChannels = UserSettingsActionCreators.FrecencyUserSettingsActionCreators.getCurrentValue()?.guildAndChannelFrecency?.guildAndChannels;
    if (!guildAndChannels) return [];

    const frequentChannelsWithQuery = Object.entries(guildAndChannels)
        .map(([key]) => key)
        .filter(id => ChannelStore.getChannel(id)?.name?.includes(query))
        .sort((id1, id2) => {
            const channel1 = guildAndChannels[id1];
            const channel2 = guildAndChannels[id2];
            return (channel2?.totalUses ?? 0) - (channel1?.totalUses ?? 0);
        })
        .slice(0, 20);

    return frequentChannelsWithQuery.map(channelID => {
        const channel = ChannelStore.getChannel(channelID);
        return (
            {
                "type": "TEXT_CHANNEL",
                "record": channel,
                "score": 20,
                "comparator": query,
                "sortable": query
            }
        );
    });
}

export default definePlugin({
    name: "FrequentQuickSwitcher",
    description: "Rewrites and filters the quick switcher results to be your most frequent channels",
    tags: ["Shortcuts", "Servers"],
    authors: [Devs.Samwich],
    generateSearchResults: generateSearchResults,
    patches: [
        {
            find: "#{intl::QUICKSWITCHER_PLACEHOLDER}",
            replacement: {
                match: /let{selectedIndex:\i,results:\i}/,
                replace: "this.props.results = $self.generateSearchResults(this.state.query);$&"
            },
        }
    ]
});
