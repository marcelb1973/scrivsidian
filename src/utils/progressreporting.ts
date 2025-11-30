export type MessageType = 'error' | 'warning' | 'info';

/**
 * Provides a common interface for reporting progress, setting current status, and optionally logging.
 */
export default interface IProgressReporting {
    /**
     * Gets the current step number.
     */
    get currentStep(): number;
    /**
     * Gets the total number of steps.
     */
    get totalSteps(): number;

    /**
     * Adds a message to the progress log
     * @param msg The message to log
     * @param type The type of message; defaults to 'info' if not provided
     */
    log(msg: string, type?: MessageType): void;
    /**
     * Sets the current status message
     * @param msg The status message to set
     */
    status(msg: string): void;
    /**
     * Updates the progress
     * @param delta The optional value to add to the currentStep property; defaults to 1.
     */
    progress(delta?: number): void;
}

/**
 * Provides an implementation of IProgressReporting that does nothing.
 */
export class NulProgressReporting implements IProgressReporting {
    get currentStep(): number {
        return 0;
    }
    get totalSteps(): number {
        return 0;
    }
    log(msg: string, type?: MessageType): void {
        // void
    }
    status(msg: string): void {
        // void
    }
    progress(delta?: number): void {
        // void
    }
}

/**
 * Provides an abstract base implementation of IProgressReporting
 */
export abstract class AbstractProgressReporting implements IProgressReporting {
    private _totalSteps: number;
    public get totalSteps(): number {
        return this._totalSteps;
    }
    protected set totalSteps(value: number) {
        if (value < 0) {
            return;
        }
        if (value == this.totalSteps) {
            return;
        }
        if (value < this._currentStep) {
            return;
        }
        this._totalSteps = value;
        this.updateProgress();
    }

    private _currentStep: number;
    public get currentStep(): number {
        return this._currentStep;
    }
    protected set currentStep(value: number) {
        if (value < 1) {
            return;
        }
        if (value > this.totalSteps) {
            return;
        }
        if (value == this.currentStep) {
            return;
        }
        this._currentStep = value;
        this.updateProgress();
    }

    /**
     * Gets the progress percentage, 0.0 to 1.0 (inclusive), or NaN if totalSteps is set to zero.
     */
    public get progressPercentage(): number {
        if (this._totalSteps == 0) {
            return NaN;
        }
        return (100.0 * this.currentStep / this.totalSteps);
    }

    protected constructor(totalItems: number) {
        this._currentStep = 0;
        this._totalSteps = totalItems;
    }

    /**
     * Updates the UI with the given message; if @msg is an empty string, status should be hidden
     * @param type The status message type
     * @param msg The status message
     */
    protected abstract typedStatus(type: MessageType, msg: string): void;
    public status(msg: string): void {
        msg = msg.trimEnd();
        if (msg == '') {
            return;
        }
        this.typedStatus('info', msg);
    }
    /**
     * Hide the status UI element.
     */
    public hideStatus(): void {
        this.typedStatus('info', '');
    }

    /**
     * Adds a message to the UI log, optionally showing it if still hidden
     * @param type The message type
     * @param msg The message to log
     */
    protected abstract typedLog(type: MessageType, msg: string): void;
    public log(msg: string, type?: MessageType): void {
        this.typedLog(type || 'info', msg);
    }
    /**
     * Adds an info message to the progress log
     * @param msg The message to log
     */
    public logInfo(msg: string): void {
        this.typedLog('info', msg);
    }
    /**
     * Adds a warning message to the progress log
     * @param msg The message to log
     */
    public logWarn(msg: string): void {
        this.typedLog('warning', msg);
    }
    /**
     * Adds an error message to the progress log
     * @param msg The message to log
     */
    public logError(msg: string): void {
        this.typedLog('error', msg);
    }

    /**
     * Updates the progress indicator
     */
    protected abstract updateProgress(): void;
    public progress(delta?: number): void {
        delta = delta || 1;
        if (delta <= 0) {
            return;
        }
        this.currentStep += delta;
    }
}

/**
 * Defines a typed message callback
 * @param type The type of message (info, warning, error)
 * @param msg The message
 */
export type TypedMessageCallback = (type: MessageType, msg: string) => void;
/**
 * Defines a callback to update the progress indicator(s)
 * @param progressReporting The IProgressReporting instance
 */
export type ProgressCallback = (progressReporting: IProgressReporting) => void;

/**
 * Provides an IProgressReporting implementation based on callbacks
 */
export class CallbackProgressReporting extends AbstractProgressReporting {
    public constructor(
        totalItems: number, protected readonly statusCallback: TypedMessageCallback,
        protected readonly logCallback: TypedMessageCallback,
        protected readonly progressCallback: ProgressCallback
    )
    {
        super(totalItems);
    }

    protected typedStatus(type: MessageType, msg: string): void {
        this.statusCallback(type, msg);
    }
    protected typedLog(type: MessageType, msg: string): void {
        this.logCallback(type, msg);
    }
    protected updateProgress(): void {
        this.progressCallback(this);
    }
}

export class HTMLElementProgressReporting extends AbstractProgressReporting {
    private readonly statusLabelEl: HTMLElement;
    private readonly logContainerEl: HTMLElement;
    private readonly logMessagesEl: HTMLElement;
    private readonly innerProgressBarEl: HTMLElement | undefined;
    private readonly progressPercentageEl: HTMLElement | undefined;

    public constructor(
        totalItems: number, statusLabelEl: HTMLElement,
        logContainerEl: HTMLElement, logMessageEl?: HTMLElement,
        innerProgressBarEl?: HTMLElement, progressPercentageEl?: HTMLElement
    ) {
        super(totalItems);
        this.statusLabelEl = statusLabelEl;
        this.logContainerEl = logContainerEl;
        this.logMessagesEl = logMessageEl || logContainerEl;
        this.innerProgressBarEl = innerProgressBarEl;
        this.progressPercentageEl = progressPercentageEl;
    }

    protected typedStatus(type: MessageType, msg: string): void {
        // we do not differentiate by message type
        this.statusLabelEl.textContent = msg;
    }
    protected typedLog(type: MessageType, msg: string): void {
        this.logMessagesEl.createDiv({ cls: `log-item item-${type}`, text: msg });
        this.logContainerEl.show();
    }
    protected updateProgress(): void {
        if (this.progressPercentageEl) {
            this.progressPercentageEl.textContent = Number.isNaN(this.progressPercentage)
                ? ''
                : this.progressPercentage.toFixed(1) + '%';
        }
        if (this.innerProgressBarEl) {
            // dynamically adjust the width of the inner part of a progressbar
            this.innerProgressBarEl.setCssProps({'width': this.progressPercentage.toFixed(1) + '%'});
        }
    }

}