import type * as NodePath from 'node:path';
import ImportModal from "src/views/import-modal/view";
export const path: typeof NodePath = window.require('node:path');

export default class ImportContext{
    protected readonly view: ImportModal;

    public get isRunning(): boolean {
        return false;
    }

    public constructor(view: ImportModal){
        this.view = view;
        this._inputPath = null;
    }

    private _inputPath: string | null;

    protected inputPathChanged(){
        // notify UI
        this.view.inputChanged();
        // TODO: update Scrivener binder
    }

    public clearInputPath(){
        if (this._inputPath === null) {
            return;
        }

        this._inputPath = null
        this.inputPathChanged();
    }

    public getInputPath(): string | null{
        return this._inputPath;
    }

    public getInputName(): string | null {
        if (this._inputPath === null) {
            return null;
        }

        return path.basename(this._inputPath);
    }

    public setInputPath(path: string){
        if (this._inputPath == path) {
            return;
        }

        this._inputPath = path;
        this.inputPathChanged();
    }

    public cancel(){ 
    }
}