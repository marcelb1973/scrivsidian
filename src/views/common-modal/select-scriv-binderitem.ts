import { ButtonComponent, Modal } from "obsidian";
import Scrivsidian from "src/main";
import { AbstractBinderItem, BinderFolder } from "src/models/binderitem";

export default class SelectScrivenerBinderItem extends Modal {
    private readonly plugin: Scrivsidian;
    private readonly treeContainerEl: HTMLElement;
    private _selectedBinderItem: AbstractBinderItem | undefined;
    private _asyncResolver: (
        value: AbstractBinderItem | PromiseLike<AbstractBinderItem | undefined> | undefined
    ) => void;
    private _asyncRejecter: (reason?: any) => void;

    public get selectedBinderItem(): AbstractBinderItem | undefined {
        return this._selectedBinderItem;
    }

    protected set selectedBinderItem(value: AbstractBinderItem | undefined) {
        this._selectedBinderItem = value;
    }

    protected constructor(plugin: Scrivsidian) {
        super(plugin.app);
        this.plugin = plugin;

        this.contentEl.addClass('scrivsidian-binder-view');
        const colHeader = this.contentEl.createDiv({ cls: 'scrivsidian-bindertree-header' });
        colHeader.createSpan({ cls: 'title', text: 'Folder in project' });
        colHeader.createSpan({ cls: 'info', text: 'Scenes' });
        this.treeContainerEl = this.contentEl.createDiv({ cls: 'scrivsidian-bindertree' });

        const buttonBar = this.contentEl.createDiv({ cls: 'scrivsidian-bindertree-buttonbar' });
        const btnCancel = new ButtonComponent(buttonBar);
        btnCancel
            .setButtonText('Cancel')
            .onClick(() => {
                this.selectedBinderItem = undefined;
                this.closeWithSuccess();
            })
        ;
    }

    private binderItemClicked(binderItem: AbstractBinderItem) {
        this.selectedBinderItem = binderItem;
        this.closeWithSuccess();
    }

    protected closeWithSuccess() {
        // deactivate rejecter path (empty callback)
        this._asyncRejecter = () => { };
        // resolve promise
        this._asyncResolver(this._selectedBinderItem);
        // deactivate resolve path (empty callback)
        this._asyncResolver = () =>{ };
        // close the modal
        this.close();
    }

    protected closeWithFail(reason?: any) {
        // deactivate resolve path (empty callback)
        this._asyncResolver = () =>{ };
        // reject promise
        this._asyncRejecter(reason);
        // close the modal
        this.close();
    }

    public override onClose(): void {
        super.onClose();
        // if not yet resolved, resolve with undefined (modal is canceled)
        this._asyncResolver(undefined);
    }

    protected createHtmlItem(
        binderItem: AbstractBinderItem, parentEl?: BinderItemHTMLElement
    ): BinderItemHTMLElement
    {
        return new BinderItemHTMLElement(
            binderItem, parentEl ? parentEl : this.treeContainerEl, item => this.binderItemClicked(item)
        );
    }

    protected createHtmlItems(
        options: AbstractBinderItem[] | Generator<AbstractBinderItem, void, unknown>
    ): boolean {
        const items: BinderItemHTMLElement[] = [];

        try
        {
            for (const option of options) {
                while (items.length > 0) {
                    const prevItem = items.last();
                    if (!prevItem || prevItem.binderItem.uuid == option.parent?.uuid) {
                        break;
                    }
                    items.pop();
                }

                const newItem = this.createHtmlItem(option, items.last());
                items.push(newItem);
            };
            return true;
        }
        catch(e) {
            this.closeWithFail(e);
            return false;
        }
    }

    protected showModal(
        binderItems: AbstractBinderItem[] | Generator<AbstractBinderItem, void, unknown>
    ): Promise<AbstractBinderItem | undefined>
    {
        return new Promise<AbstractBinderItem | undefined>(
            (resolve, reject) => {
                this._asyncResolver = resolve;
                this._asyncRejecter = reject;
                if (!this.createHtmlItems(binderItems)) {
                    return;
                }
                this.open();
            }
        );
    }

    public static select(
        plugin: Scrivsidian,
        binderItems: AbstractBinderItem[] | Generator<AbstractBinderItem, void, unknown>
    )
        : Promise<AbstractBinderItem | undefined>
    {
        return new SelectScrivenerBinderItem(plugin).showModal(binderItems);
    }
}

class BinderItemHTMLElement {
    private readonly _containerEl: HTMLElement;
    private readonly _binderItemEl: HTMLElement;
    private readonly _binderItem: AbstractBinderItem;

    public get binderItem() {
        return this._binderItem;
    }

    public constructor(
        binderItem: AbstractBinderItem, parent: BinderItemHTMLElement | HTMLElement,
        onSelected: (item: AbstractBinderItem) => void
    )
    {
        this._binderItem = binderItem
        if (parent instanceof BinderItemHTMLElement) {
            this._containerEl = parent._binderItemEl;
        }
        else {
            this._containerEl = parent;
        }

        const ul = this._containerEl.find('ul') ?? this._containerEl.createEl('ul');

        this._binderItemEl = ul.createEl('li');
        const div = this._binderItemEl.createDiv();
        div.createSpan({ cls: 'title', text: this._binderItem.title });
        div.createSpan({ 
            cls: 'info',
            text: (this.binderItem as BinderFolder).totalSceneCount.toString()
        });
        div.setAttr('data-uuid', this._binderItem.uuid);
        div.onClickEvent(() => {
            onSelected(binderItem);
        });
    }
}