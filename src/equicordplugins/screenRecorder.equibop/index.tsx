/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { ScreenshareIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, UploadHandler } from "@webpack/common";

let recoder: MediaRecorder | null = null;

export default definePlugin({
    name: "ScreenRecorder",
    description: "Adds an option to record your screen and upload the recording to the channel",
    tags: ["Chat"],
    authors: [Devs.AutumnVN],
    contextMenus: {
        "channel-attach": startRecording
    },
    stop() {
        if (recoder) {
            if (recoder.state !== "inactive") {
                recoder.stop();
            }
            recoder.stream?.getTracks().forEach(t => t.stop());
            recoder = null;
        }
        removeContextMenuPatch("channel-attach", stopRecording);
    }
});

function startRecording(children) {
    children.push(
        <Menu.MenuItem
            id="start-recording"
            label={
                <div>
                    <ScreenshareIcon height={24} width={24} />
                    <div>Start Recording</div>
                </div>
            }
            action={async () => {
                const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: { ideal: 60 } } });
                recoder = new MediaRecorder(stream);
                recoder.start();
                removeContextMenuPatch("channel-attach", startRecording);
                addContextMenuPatch("channel-attach", stopRecording);
            }}
        />
    );
}

function stopRecording(children, props) {
    children.push(
        <Menu.MenuItem
            id="stop-recording"
            label={
                <div>
                    <ScreenshareIcon height={24} width={24} />
                    <div>Stop Recording</div>
                </div>
            }
            action={() => {
                const activeRecorder = recoder;
                if (activeRecorder) {
                    activeRecorder.addEventListener("dataavailable", e => {
                        const file = new File([e.data], "recording.webm", { type: "video/webm" });
                        UploadHandler.promptToUpload([file], props.channel, 0);
                    }, { once: true });
                    if (activeRecorder.state !== "inactive") {
                        activeRecorder.stop();
                    }
                    activeRecorder.stream?.getTracks().forEach(t => t.stop());
                    recoder = null;
                }
                removeContextMenuPatch("channel-attach", stopRecording);
                addContextMenuPatch("channel-attach", startRecording);
            }}
        />
    );
}
