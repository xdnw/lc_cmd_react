export function toSelAndModifierString(selAndModifiers: { [key: string]: string }): string | undefined {
    let sel = undefined;
    if (Object.keys(selAndModifiers).length === 1) {
        sel = selAndModifiers[""];
    } else if (Object.keys(selAndModifiers).length > 1) {
        sel = JSON.stringify(selAndModifiers);
    }
    return sel;
}
