/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LineEmoji, LineEmojiPack, Sticker, StickerPack } from "./types";
import { corsFetch } from "./utils";

export interface StickerCategory {
    title: string;
    id: number;
    packs: {
        title: string;
        id: string;
        img: string;
    }[];
}

/**
 * Get ID of sticker pack from a URL
 *
 * @param url The URL to get the ID from.
 * @returns {string} The ID.
 * @throws {Error} If the URL is invalid.
 */

export function getIdFromUrl(url: string): string {
    const re = /^https:\/\/store\.line\.me\/emojishop\/product\/([a-z0-9]+)\/.*$/;
    const match = re.exec(url);
    if (match === null) {
        throw new Error("Invalid URL");
    }
    return match[1];
}

/**
 * Convert LineEmojiPack id to StickerPack id
 *
 * @param id The id to convert.
 * @returns {string} The converted id.
 */

function toStickerPackId(id: string): string {
    return "MoreStickers:Line:Emoji-Pack:" + id;
}

/**
 * Convert LineEmoji id to Sticker id
 *
 * @param stickerId The id to convert.
 * @param lineEmojiPackId The id of the LineEmojiPack.
 * @returns {string} The converted id.
 */

function toStickerId(stickerId: string, lineEmojiPackId: string): string {
    return "MoreStickers:Line-Emoji:" + lineEmojiPackId + ":" + stickerId;
}

function safeParsePreview<T>(raw?: string): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
  * Convert LineEmoji to Sticker
  *
  * @param {LineEmoji} s The LineEmoji to convert.
  * @return {Sticker} The sticker.
  */
export function convertSticker(s: LineEmoji | null | undefined): Sticker {
    return {
        id: toStickerId(s?.id ?? "", s?.stickerPackId ?? ""),
        image: s?.animationUrl || s?.staticUrl || "",
        title: s?.id ?? "",
        stickerPackId: toStickerPackId(s?.stickerPackId ?? ""),
        isAnimated: !!s?.animationUrl
    };
}

/**
  * Convert LineEmojiPack to StickerPack
  *
  * @param {LineEmojiPack} sp The LineEmojiPack to convert.
  * @return {StickerPack} The sticker pack.
  */
export function convert(sp: LineEmojiPack): StickerPack {
    return {
        id: toStickerPackId(sp.id),
        title: sp.title,
        author: sp.author,
        logo: convertSticker(sp.mainImage ?? sp.stickers[0]),
        stickers: sp.stickers.map(convertSticker)
    };
}

/**
  * Get stickers from given HTML
  *
  * @param {string} html The HTML.
  * @return {Promise<LineEmojiPack>} The sticker pack.
  */
export function parseHtml(html: string): LineEmojiPack {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const rawMainImage = safeParsePreview<LineEmoji>((doc.querySelector("[ref=mainImage]") as HTMLElement)?.dataset?.preview);
    const rawStickers =
        [...doc.querySelectorAll(".FnStickerPreviewItem")]
            .map(x => safeParsePreview<LineEmoji>((x as HTMLElement).dataset?.preview))
            .filter((x): x is LineEmoji => x !== null);
    const id = rawMainImage?.id ?? rawStickers[0]?.id ?? "";
    const stickers = rawStickers.map(x => ({ ...x, stickerPackId: id }));
    const mainImage = rawMainImage ? { ...rawMainImage, stickerPackId: id } : (stickers[0] ?? null);

    const stickerPack = {
        title: doc.querySelector("[data-test=emoji-name-title]")?.textContent ?? "null",
        author: {
            name: doc.querySelector("[data-test=emoji-author]")?.textContent ?? "null",
            url: "https://store.line.me/" + (doc.querySelector("[data-test=emoji-author]")?.getAttribute("href") ?? "null")
        },
        id,
        mainImage,
        stickers
    } as LineEmojiPack;

    return stickerPack;
}

export function isLineEmojiPackHtml(html: string): boolean {
    return html.includes("data-test=\"emoji-name-title\"");
}

/**
  * Get stickers from LINE
  *
  * @param {string} id The id of the sticker pack.
  * @return {Promise<LineEmojiPack>} The sticker pack.
  */
export async function getStickerPackById(id: string, region = "en"): Promise<LineEmojiPack> {
    const res = await corsFetch(`https://store.line.me/emojishop/product/${id}/${region}`);
    const html = await res.text();

    return parseHtml(html);
}
