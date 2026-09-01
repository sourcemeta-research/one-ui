import type { Monaco } from "@monaco-editor/react";

export const ONE_UI_MONACO_THEME = "one-ui-dark";

export const defineMonacoTheme = (monaco: Monaco) => {
  monaco.editor.defineTheme(ONE_UI_MONACO_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1d1915",
      "editor.lineHighlightBackground": "#2f282022",
      "editorLineNumber.foreground": "#9c8f77",
      "editorGutter.background": "#1d1915",
      "editor.selectionBackground": "#e8963e33",
      "scrollbarSlider.background": "#4f443355",
      "scrollbarSlider.hoverBackground": "#4f443388",
    },
  });
};
