export const shouldPlayKeyboardSound = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
    return false;
  }

  return (
    event.key.length === 1 ||
    event.key === "Backspace" ||
    event.key === "Delete" ||
    event.key === "Enter"
  );
};
