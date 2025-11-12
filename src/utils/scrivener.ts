import { XMLParser } from "fast-xml-parser";
import type * as NodeFS from "node:fs";
import type * as NodePath from 'node:path';
import Scrivsidian from "src/main";
import { AbstractBinderFolder, AbstractBinderItem, BinderFolder, BinderProject, BinderScene } from "src/models/binderitem";

const fs: typeof NodeFS = window.require('node:original-fs');
const path: typeof NodePath = window.require('node:path');

/**
 * Class to load and parse a Scrivener project
 */
export default class Scrivener {
    private _projectFileFullPath: string;
    /**
     * Gets the loaded project's full file path
     */
    public get projectFileFullPath(): string {
        return this._projectFileFullPath;
    }

    /**
     * Gets the loaded project's file name, including the extension
     */
    public get projectFileName(): string | null {
        if (!this._projectFileFullPath) {
            return null;
        }

        return path.basename(this._projectFileFullPath);
    }

    /**
     * Gets the loaded project's name (the file name without the extension)
     */
    public get projectName(): string {
        const name = this.projectFileName;
        if (!name) {
            return '';
        }

        return name.substring(0, name.length - '.scrivx'.length);
    }

    private _binder: BinderProject;
    /**
     * Gets the loaded project's binder tree
     */
    public get binder(): BinderProject {
        return this._binder;
    }

    /**
     * Initializes a instance of the Scrivener class
     * @param plugin The current Scrivsidian plugin instance
     */
    public constructor(private readonly plugin: Scrivsidian) {
        this._binder = new BinderProject('');
    }

    /**
     * Loads a new Scrivener project file and build the binder tree
     * @param projectFileFullPath The full file path to the project file
     */
    public load(projectFileFullPath: string) {
        const xml = new XMLParser({
            allowBooleanAttributes: true,
            ignoreAttributes: false,
            ignoreDeclaration: true,
            attributeNamePrefix: "",
            ignorePiTags: true,
            numberParseOptions: {
                leadingZeros: true,
                hex: true,
                skipLike: /\+[0-9]{10}/
            },
            parseAttributeValue: true,
            parseTagValue: true,
            isArray: (name, jpath, isLeafNode, isAttribute) => {
                return name == 'BinderItem' && !isAttribute;
            }
        });

        const data = fs.readFileSync(projectFileFullPath, {encoding: 'utf8'});

        const parsedObj = xml.parse(data);

        if(parsedObj) {
            this._projectFileFullPath = projectFileFullPath;
            this.readStructure(parsedObj.ScrivenerProject);
        }
        else
        {
            this._projectFileFullPath = '';
            this._binder = new BinderProject('');
        }
    }

    private readStructure(projectXml: any) {
        this._binder = new BinderProject(this.projectName);
        projectXml.Binder.BinderItem.forEach((element: any) => {
            this.addBinderItem(element, this._binder);
        });
    }

    private addBinderItem(element: any, parent?: AbstractBinderFolder) {
        const binderItem: AbstractBinderItem = Scrivener.isFolderElement(element)
            ? new BinderFolder(element.UUID, element.Title, parent)
            : new BinderScene(element.UUID, element.Title, parent!);

        if (binderItem instanceof BinderFolder && element.Children && element.Children.BinderItem) {
            try {
                element.Children.BinderItem.forEach((childElement: any) => {
                    this.addBinderItem(childElement, binderItem);
                });
            } catch {
                this.plugin.logError(`Unable to process children on ${binderItem.title}`);
            }
        }
    }

    private static isFolderElement(element: any) {
        return element.Children || element.Type == 'Folder' || element.Type == 'TrashFolder' || element.Type == 'DraftFolder'
    }

    private * iterateBinder(
        first: AbstractBinderItem, predicate: (item: AbstractBinderItem) => boolean
    ): Generator<AbstractBinderItem, void, any> {
        if (!predicate(first)) {
            this.plugin.logInfo('Skipping ' + first.uuid + ' [' + first.title + ']');
            return;
        }

        yield first;

        if (first instanceof AbstractBinderFolder) {
            for(const child of first.children) {
                yield* this.iterateBinder(child, predicate);
            }
        }
    }

    public importableFolders() {
        this.plugin.logInfo('importableFolders entered');
        return this.iterateBinder(
            this.binder,
            (bi) => bi instanceof AbstractBinderFolder // && bi.totalSceneCount > 0
        );
    }

    public findImportableFolder(uuid: string): AbstractBinderFolder | undefined {
        for (const importableItem of this.importableFolders()) {
            if (importableItem instanceof AbstractBinderFolder && importableItem.uuid == uuid) {
                return importableItem;
            }
        }
    }
}
