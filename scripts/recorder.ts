
export interface DeepCopyable {
    deepcopy(): this
}

export class EditRecorder<T extends DeepCopyable> {
    target: T
    history: Array<T>
    revHistory: Array<T>
    constructor(target: T) {
        this.target = target
        this.history = []
        this.revHistory = []
    }

    record(): void {
        if (this.revHistory.length > 0)
            this.revHistory = []
        this.history.push(this.target.deepcopy())
    }

    peek(): T | null {
        if (this.history.length > 0)
            return this.history[this.history.length - 1]
        else
            return null
    }

    undo(): T | null {
        if (this.history.length > 0) {
            this.revHistory.push(this.target.deepcopy())
            this.target = this.history.pop()!
            return this.target
        }
        return null
    }

    redo(): T | null {
        if (this.revHistory.length > 0) {
            this.history.push(this.target.deepcopy())
            this.target = this.revHistory.pop()!
            return this.target
        }
        return null;
    }
}