import { XMLParser } from "fast-xml-parser";
import * as NodeFS from "node:fs";
import type * as NodePath from 'node:path';
import { App, DataWriteOptions, normalizePath, TFolder } from "obsidian";
import Scrivsidian from "src/main";
import { AbstractBinderFolder, AbstractBinderItem, BinderFolder, BinderProject, BinderScene } from "src/models/binderitem";
import IProgressReporting from "./progressreporting";
import rtf2md from "./rtf2md";
import ImportContext from "src/models/importcontext";
import Keyword from "src/models/keyword";

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

    protected get app(): App {
        return this.plugin.app;
    }

    private _progressReporting: IProgressReporting | undefined;
    protected get progressReporting(): IProgressReporting | undefined {
        return this._progressReporting;
    }

    private _context: ImportContext | undefined;
    protected get context(): ImportContext | undefined {
        return this._context;
    }

    private _keywords: Map<number, Keyword> = new Map<number, Keyword>();
    protected get keywords(): Map<number, Keyword> {
        return this._keywords
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
                return !isAttribute && (name == 'BinderItem' || name == 'Keyword' || name == 'KeywordID');
            }
        });

        const data = fs.readFileSync(projectFileFullPath, {encoding: 'utf8'});

        const parsedObj = xml.parse(data);

        if(parsedObj) {
            this._projectFileFullPath = projectFileFullPath;
            this.readKeywords(parsedObj.ScrivenerProject)
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

    private readKeywords(projectXml: any) {
        this.keywords.clear();
        if (!projectXml.Keywords) {
            return;
        }
        if (!projectXml.Keywords.Keyword) {
            return;
        }
        projectXml.Keywords.Keyword.forEach((element: any) => {
            this.addKeyword(element);
        });
    }

    protected static parseBinderDate(value: string): Date | undefined {
        if (value.length < 25) {
            return undefined;
        }

        value = value.substring(0, 10) + 'T' + value.substring(11, 19) + value.substring(20);
        return new Date(value);
    }

    private addBinderItem(element: any, parent?: AbstractBinderFolder) {
        const createdDate = Scrivener.parseBinderDate(element.Created);
        const modifiedDate = Scrivener.parseBinderDate(element.Modified);
        const binderItem: AbstractBinderItem = Scrivener.isFolderElement(element)
            ? new BinderFolder(element.UUID, element.Title, parent, createdDate, modifiedDate)
            : new BinderScene(element.UUID, element.Title, parent!, createdDate, modifiedDate);

        if (element.Keywords) {
            element.Keywords.KeywordID.forEach((element: any) => {
                const kwd = this.keywords.get(element);
                if (kwd) {
                    binderItem.addKeyword(kwd);
                }
            });
        }

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

    private addKeyword(element: any) {
        const keyword = new Keyword(element.ID, element.Title);
        this._keywords.set(keyword.id, keyword);
    }

    private static isFolderElement(element: any) {
        return element.Children || element.Type == 'Folder' || element.Type == 'TrashFolder' || element.Type == 'DraftFolder'
    }

    private * iterateBinder(
        first: AbstractBinderItem, predicate: (item: AbstractBinderItem) => boolean
    ): Generator<AbstractBinderItem, void, any> {
        if (!predicate(first)) {
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
        return this.iterateBinder(
            this.binder,
            (bi) => bi instanceof AbstractBinderFolder
        );
    }

    public findImportableFolder(uuid: string): AbstractBinderFolder | undefined {
        for (const importableItem of this.importableFolders()) {
            if (importableItem instanceof AbstractBinderFolder && importableItem.uuid == uuid) {
                return importableItem;
            }
        }
    }

    private _cancellationRequested: boolean;

    public cancel(): void {
        this._cancellationRequested = true;
    }

    public async import(reporting: IProgressReporting, ctx: ImportContext): Promise<void> {
        if (!ctx.outputLocation) {
            reporting.log("Output location not set", "error");
            return;
        }

        this._context = ctx;
        this._progressReporting = reporting;

        try {
            const outputLocation = ctx.createSubFolderForProject && ctx.root != this.binder
                ? await this.app.vault.createFolder(ctx.fullOutputPath)
                : ctx.outputLocation;

            if (ctx.root instanceof AbstractBinderFolder) {
                await this.importFolder(ctx.root, outputLocation);
                return;
            }

            reporting.log("No or invalid binder item selected", "error");
        }
        finally {
            this._context = undefined;
            this._progressReporting = undefined;
        }
    }

    private async importFolder(binderFolder: AbstractBinderFolder, vaultParentFolder: TFolder, prefix?: number): Promise<void> {
        this._progressReporting!.progress();
        this._progressReporting!.status(`Import folder ${binderFolder.uuid}: ${binderFolder.title}`);
        const vaultItemName = (prefix !== undefined ? prefix.toString() + ' - ' : '') + sanitizeTitle(binderFolder);

        const newVaultFolder = await this.app.vault.createFolder(path.join(vaultParentFolder.path, vaultItemName));
        const needPrefix = binderFolder.needIndexPrefixForChildren;

        // if the folder has actual content, add it as a '0.md' file to the vault folder
        await this.createAndConvert(binderFolder, path.join(newVaultFolder.path, '0.md'));

        for(let index = 0; index < binderFolder.children.length; index++) {
            if (this._cancellationRequested) {
                break;
            }
            const subItem = binderFolder.children[index];
            if (subItem instanceof AbstractBinderFolder) {
                await this.importFolder(subItem, newVaultFolder, needPrefix ? index + 1 : undefined);
            }
            if (subItem instanceof BinderScene) {
                await this.importScene(subItem, newVaultFolder, needPrefix ? index + 1 : undefined);
            }
        }
    }
 
    private async importScene(binderScene: BinderScene, vaultParentFolder: TFolder, prefix?: number): Promise<void> {
        this._progressReporting!.progress();
        this._progressReporting!.status(`Import scene ${binderScene.uuid}: ${binderScene.title}`);

        // determine note name
        const vaultItemName = (prefix !== undefined ? prefix.toString() + ' - ' : '') + sanitizeTitle(binderScene) + '.md';

        // create vault note and convert Scrivener content
        await this.createAndConvert(binderScene, path.join(vaultParentFolder.path, vaultItemName));
    }

    private async getScrivenerContentFile(binderItem: AbstractBinderItem) {
        const contentPath = path.join(path.dirname(this.projectFileFullPath), 'Files/Data', binderItem.uuid, 'content.rtf');
        if (fs.existsSync(contentPath)) {
            return await fs.promises.open(contentPath, fs.constants.O_RDONLY)
        }
    }

    private async createAndConvert(binderItem: AbstractBinderItem, vaultPath: string) {
        const file = await this.getScrivenerContentFile(binderItem);

        const size = (await file?.stat())?.size ?? 0;

        if (!size) {
            return;
        }

        const options: DataWriteOptions = {
            ctime: binderItem.createdOn?.valueOf(),
            mtime: binderItem.modifiedOn?.valueOf() ?? binderItem.createdOn?.valueOf()
        };

        const newVaultFile = await this.app.vault.create(vaultPath, ``, options);

        if (this.hasFrontMatter(binderItem)) {
            this.app.fileManager.processFrontMatter(newVaultFile, frontMatter => {
                if (this.hasScrivenerUUIDFrontMatter()) {
                    frontMatter['scrivener_uuid'] = binderItem.uuid
                }
                if (this.hasKeywordsFrontMatter(binderItem)) {
                    frontMatter['tags'] = binderItem.keywords.map((kwd) => kwd.name);
                }
            }, options);
        }

        await rtf2md(file!.createReadStream(), newVaultFile, options);
    }

    private hasFrontMatter(binderItem: AbstractBinderItem): boolean {
        if (this.hasScrivenerUUIDFrontMatter()) {
            return true;
        }
        if (this.hasKeywordsFrontMatter(binderItem)) {
            return true;
        }

        return false;
    }

    private hasScrivenerUUIDFrontMatter(): boolean {
        return this.context?.includeScrivenerUUIDProperty || false;
    }

    private hasKeywordsFrontMatter(binderItem: AbstractBinderItem): boolean {
        if (!this.context?.keywordsAsTags) {
            return false;
        }

        return binderItem.keywords.length > 0;
    }
}

const illegalRe = /[\/\?<>\\:\*\|"]/g;
const controlRe = /[\x00-\x1f\x80-\x9f]/g;
const reservedRe = /^\.+$/;
const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const windowsTrailingRe = /[\. ]+$/;
const startsWithDotRe = /^\./; // Regular expression to match filenames starting with "."
const badLinkRe = /[\[\]#|^]/g; // Regular expression to match characters that interferes with links: [ ] # | ^

function sanitizeTitle(binderItem: AbstractBinderItem): string {
    return binderItem.title
        .replace(illegalRe, '')
        .replace(controlRe, '')
        .replace(reservedRe, '')
        .replace(windowsReservedRe, '')
        .replace(windowsTrailingRe, '')
        .replace(startsWithDotRe, '')
        .replace(badLinkRe, '');
};
