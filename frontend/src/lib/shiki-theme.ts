/**
 * Custom Shiki themes aligned with the DataSpeak brand palette.
 * Light: brand-700 (#c2410c) for keywords, accent-700 for strings.
 * Dark:  lighter counterparts for readability on dark backgrounds.
 */

const SQL_KEYWORD_SCOPES = [
  "keyword.other.DML.sql",
  "keyword.other.DDL.sql",
  "keyword.other.sql",
  "keyword.control.sql",
  "keyword.reserved",
  "keyword",
  "storage.type.sql",
  "storage.type",
];

const SQL_STRING_SCOPES = [
  "string.quoted.single.sql",
  "string.quoted.double.sql",
  "string",
];

const SQL_NUMBER_SCOPES = [
  "constant.numeric.sql",
  "constant.numeric",
];

const SQL_CONSTANT_SCOPES = [
  "constant.language.sql",
  "constant.language",
];

const SQL_COMMENT_SCOPES = [
  "comment.line.double-dash.sql",
  "comment.block.sql",
  "comment",
];

const SQL_FUNCTION_SCOPES = [
  "support.function.sql",
  "support.function",
  "entity.name.function.sql",
  "entity.name.function",
];

const SQL_OPERATOR_SCOPES = [
  "keyword.operator.sql",
  "keyword.operator.comparison.sql",
  "keyword.operator.logical.sql",
  "keyword.operator",
];

export const dataspeakLight = {
  name: "dataspeak-light",
  type: "light" as const,
  colors: {
    "editor.background": "#f7f5f1",
    "editor.foreground": "#24201c",
    "editor.lineHighlightBackground": "#ede9e3",
    "editorCursor.foreground": "#c2410c",
    "editor.selectionBackground": "#c2410c22",
  },
  tokenColors: [
    {
      scope: SQL_KEYWORD_SCOPES,
      settings: { foreground: "#c2410c", fontStyle: "bold" },
    },
    {
      scope: SQL_STRING_SCOPES,
      settings: { foreground: "#0f5568" },
    },
    {
      scope: SQL_NUMBER_SCOPES,
      settings: { foreground: "#4a4540" },
    },
    {
      scope: SQL_CONSTANT_SCOPES,
      settings: { foreground: "#9a3000", fontStyle: "italic" },
    },
    {
      scope: SQL_COMMENT_SCOPES,
      settings: { foreground: "#7c7570", fontStyle: "italic" },
    },
    {
      scope: SQL_FUNCTION_SCOPES,
      settings: { foreground: "#9a3500" },
    },
    {
      scope: SQL_OPERATOR_SCOPES,
      settings: { foreground: "#635e58" },
    },
    {
      scope: ["punctuation", "meta.separator"],
      settings: { foreground: "#7c7570" },
    },
  ],
};

export const dataspeakDark = {
  name: "dataspeak-dark",
  type: "dark" as const,
  colors: {
    "editor.background": "#26231b",
    "editor.foreground": "#ede9e3",
    "editor.lineHighlightBackground": "#2e2b22",
    "editorCursor.foreground": "#e8813a",
    "editor.selectionBackground": "#e8813a22",
  },
  tokenColors: [
    {
      scope: SQL_KEYWORD_SCOPES,
      settings: { foreground: "#e8813a", fontStyle: "bold" },
    },
    {
      scope: SQL_STRING_SCOPES,
      settings: { foreground: "#5ab0c5" },
    },
    {
      scope: SQL_NUMBER_SCOPES,
      settings: { foreground: "#b8b3ac" },
    },
    {
      scope: SQL_CONSTANT_SCOPES,
      settings: { foreground: "#f4933f", fontStyle: "italic" },
    },
    {
      scope: SQL_COMMENT_SCOPES,
      settings: { foreground: "#7a7570", fontStyle: "italic" },
    },
    {
      scope: SQL_FUNCTION_SCOPES,
      settings: { foreground: "#f4933f" },
    },
    {
      scope: SQL_OPERATOR_SCOPES,
      settings: { foreground: "#a09a93" },
    },
    {
      scope: ["punctuation", "meta.separator"],
      settings: { foreground: "#7a7570" },
    },
  ],
};
