import { Plugin } from "obsidian";
import { init } from "./utils/plugin.init";

declare global {
	interface Window {
		electron: any;
		require: NodeRequire;
	}
}

export default class Scrivsidian extends Plugin {

    public readonly ActionTitle = 'Import from Scrivener';

    public logInfo(message: string){
        console.log(`[${this.manifest.name}] ${message}`)
    }

    public logWarning(message: string){
        console.warn(`[${this.manifest.name}] ${message}`)
    }

    public logError(message: string){
        console.error(`[${this.manifest.name}] ${message}`)
    }

    async onload() {
        this.logInfo(`Loading ${this.manifest.name} ${this.manifest.version}...`);
        init(this);
    }
}