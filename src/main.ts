import { Plugin } from "obsidian";
import { init } from "./utils/plugin.init";

declare global {
	interface Window {
		electron: any;
		require: NodeRequire;
	}
}

export default class Scrivsidian extends Plugin {
    async onload() {
        console.log(`[Scrivsidian] Loading Scrivsidian ${this.manifest.version}...`);
        init(this);
    }
}