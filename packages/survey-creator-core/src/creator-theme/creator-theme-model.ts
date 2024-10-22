import { Serializer, Base, property, ArrayChanges, EventBase, ILoadFromJSONOptions, ISaveToJSONOptions } from "survey-core";
import { getLocString } from "../editorLocalization";
import { assign, roundTo2Decimals } from "../utils/utils";
import { CreatorThemes, ICreatorTheme, PredefinedCreatorThemes } from "./creator-themes";
import * as Themes from "survey-creator-core/themes";

Object.keys(Themes || {}).forEach(themeName => {
  const theme: ICreatorTheme = Themes[themeName];
  if (PredefinedCreatorThemes.indexOf(theme.themeName) === -1) {
    PredefinedCreatorThemes.push(theme.themeName);
  }
  CreatorThemes[theme.themeName] = theme;
});

export class CreatorThemeModel extends Base implements ICreatorTheme {
  static defautlThemeName = "sc2020";
  initialCssVariables: { [index: string]: string } = {};
  themeCssVariablesChanges?: { [index: string]: string } = {};

  unitDictionary: { [index: string]: number } = {
    "--ctr-font-unit": 8,
    "--ctr-line-height-unit": 8,
    "--ctr-size-unit": 8,
    "--ctr-spacing-unit": 8,
    "--ctr-corner-radius-unit": 8,
    "--ctr-stroke-unit": 1,
    "--ctr-surface-base-unit": 8,
  }

  @property() themeName: string = CreatorThemeModel.defautlThemeName;
  @property() scale: number;
  @property() fontScale: number;
  @property() surfaceScale: number;
  @property() isLight: boolean = true;

  public onThemeSelected = new EventBase<CreatorThemeModel, { theme: ICreatorTheme }>();
  public onThemePropertyChanged = new EventBase<CreatorThemeModel, { name: string, value: any }>();

  constructor() {
    super();
    this.onPropertyValueChangedCallback = (
      name: string,
      oldValue: any,
      newValue: any,
      sender: Base,
      arrayChanges: ArrayChanges
    ) => {
      this.onThemePropertyValueChangedCallback(
        name,
        oldValue,
        newValue,
        sender,
        arrayChanges
      );
    };
  }

  public getType(): string {
    return "creatortheme";
  }

  public get cssVariables(): { [index: string]: string } {
    return this.toJSON()["cssVariables"] || {};
  }

  private setThemeCssVariablesChanges(name: string, value: any) {
    if (this.themeCssVariablesChanges[name] !== value) {
      this.themeCssVariablesChanges[name] = value;
      this.onThemePropertyChanged.fire(this, { name, value });
    }
  }
  private onThemePropertyValueChangedCallback(name: string, oldValue: any, newValue: any, sender: Base, arrayChanges: ArrayChanges) {
    if (this.blockThemeChangedNotifications > 0) return;

    if (name === "themeName") {
      this.loadTheme({ themeName: newValue });
      this.onThemeSelected.fire(this, { theme: this.toJSON() });
    } else if (name.indexOf("--") === 0) {
      this.setThemeCssVariablesChanges(name, newValue);
    } else if (name == "fontScale" || name == "scale" || name == "surfaceScale") {
      this.scalePropertiesChanged(name, newValue);
    }
  }
  private scalePropertiesChanged(propertyName: string, newValue: number) {
    if (propertyName == "fontScale") {
      this.scalingProperties("--ctr-font-unit", newValue);
      this.scalingProperties("--ctr-line-height-unit", newValue);
    } else if (propertyName == "scale") {
      this.scalingProperties("--ctr-size-unit", newValue);
      this.scalingProperties("--ctr-spacing-unit", newValue);
      this.scalingProperties("--ctr-corner-radius-unit", newValue);

    } else if (propertyName == "surfaceScale") {
      this.scalingProperties("--ctr-surface-base-unit", newValue);
    }
  }
  private scalingProperties(cssName: string, newValue: number) {
    const baseUnit = this.unitDictionary[cssName];
    this.setThemeCssVariablesChanges(cssName, (newValue * baseUnit / 100) + "px");
  }
  private scaleValue(cssName: string, scale: number) {
    const baseUnit = this.unitDictionary[cssName];
    this[cssName] = (scale * baseUnit / 100) + "px";
  }
  private scaleCssVariables() {
    if (this.fontScale !== undefined) {
      this.scaleValue("--ctr-font-unit", this.fontScale);
      this.scaleValue("--ctr-line-height-unit", this.fontScale);
    }
    if (this.scale !== undefined) {
      this.scaleValue("--ctr-size-unit", this.scale);
      this.scaleValue("--ctr-spacing-unit", this.scale);
      this.scaleValue("--ctr-corner-radius-unit", this.scale);
    }
    if (this.surfaceScale !== undefined) {
      this.scaleValue("--ctr-surface-base-unit", this.surfaceScale);
    }
  }
  private getScaleFactor(cssName: string): number {
    return !!this[cssName] ? roundTo2Decimals(parseFloat(this[cssName]) * 100 / this.unitDictionary[cssName]) : undefined;
  }
  private updateScaleProperties() {
    this.blockThemeChangedNotifications += 1;
    try {
      this.fontScale = this.getScaleFactor(/*this.isDefaultTheme ? "--ctr-font-size" :*/ "--ctr-font-unit");
      this.scale = this.getScaleFactor(/*this.isDefaultTheme ? "--sjs-base-unit" :*/ "--ctr-size-unit");
      this.surfaceScale = this.getScaleFactor("--ctr-surface-base-unit");
    } finally {
      this.blockThemeChangedNotifications -= 1;
    }
  }

  private blockThemeChangedNotifications = 0;
  public loadTheme(theme: ICreatorTheme = {}) {
    this.blockThemeChangedNotifications += 1;
    try {
      const baseTheme = CreatorThemes[theme.themeName] || {};
      this.themeName = theme.themeName || baseTheme.themeName || CreatorThemeModel.defautlThemeName;

      const effectiveThemeCssVariables = {};
      assign(effectiveThemeCssVariables, baseTheme.cssVariables || {});
      assign(effectiveThemeCssVariables, theme.cssVariables || {}, this.themeCssVariablesChanges);

      const effectiveTheme: ICreatorTheme = {};
      assign(effectiveTheme, baseTheme, theme, { cssVariables: effectiveThemeCssVariables, themeName: this.themeName });

      // this.initializeColorCalculator(effectiveTheme.cssVariables);
      this.fromJSON(effectiveTheme);
    } finally {
      this.blockThemeChangedNotifications -= 1;
    }
  }

  fromJSON(json: ICreatorTheme, options?: ILoadFromJSONOptions): void {
    if (!json) return;

    const _json = {};
    assign(_json, json);
    delete _json["cssVariables"];
    super.fromJSON(_json, options);

    if (json.cssVariables) {
      super.fromJSON(json.cssVariables, options);
      this.initialCssVariables = {};
      assign(this.initialCssVariables, json.cssVariables);

      this.updateScaleProperties();
    }
  }

  toJSON(options?: ISaveToJSONOptions): ICreatorTheme {
    this.scaleCssVariables();

    const result = super.toJSON(options);
    const cssVariables = {};
    assign(cssVariables, this.initialCssVariables, this.themeCssVariablesChanges);
    result.cssVariables = cssVariables;
    Object.keys(result).forEach(key => {
      if (key.indexOf("--") == 0) {
        delete result[key];
      }
    });
    if (Object.keys(result.cssVariables).length === 0) {
      delete result.cssVariables;
    }
    return result;
  }
}

Serializer.addClass(
  "creatortheme",
  [
    {
      type: "dropdown",
      name: "themeName",
      choices: PredefinedCreatorThemes.map(theme => ({ value: theme, text: getLocString("creatortheme.names." + theme) })),
    }
  ],
  (json) => { return new CreatorThemeModel(); }
);

Serializer.addProperties("creatortheme", [
  {
    type: "color",
    name: "--sjs-special-background",
    default: "#F3F3F3FF",
    onPropertyEditorUpdate: function (obj: any, editor: any) {
      if (!!editor) {
        editor.title = getLocString("creatortheme.--sjs-special-background");
      }
    }
  }, {
    type: "color",
    name: "--sjs-primary-background-500",
    default: "#19B394FF",
    onPropertyEditorUpdate: function (obj: any, editor: any) {
      if (!!editor) {
        editor.title = getLocString("creatortheme.--sjs-primary-background-500");
      }
    },
  }, {
    type: "color",
    name: "--sjs-secondary-background-500",
    default: "#FF9814FF",
    displayName: ""
  }, {
    name: "--ctr-font-unit",
    default: "8px",
    visible: false,
  }, {
    name: "--ctr-line-height-unit",
    default: "8px",
    visible: false,
  }, {
    type: "spinedit",
    name: "fontScale",
    isSerializable: false,
    default: 100,
    enableIf: (obj: CreatorThemeModel): boolean => {
      return !obj || obj.themeName !== CreatorThemeModel.defautlThemeName;
    },
    onPropertyEditorUpdate: function (obj: any, editor: any) {
      if (!!editor) {
        editor.unit = "%";
        editor.min = 0;
        editor.step = 5;
        editor.title = getLocString("creatortheme.fontScale");
        editor.titleLocation = "left";
        editor.descriptionLocation = "hidden";
      }
    }
  }, {
    name: "--ctr-spacing-unit",
    default: "8px",
    visible: false,
  }, {
    name: "--ctr-size-unit",
    default: "8px",
    visible: false,
  }, {
    name: "--ctr-corner-radius-unit",
    default: "8px",
    visible: false,
  }, {
    type: "spinedit",
    name: "scale",
    isSerializable: false,
    default: 100,
    enableIf: (obj: CreatorThemeModel): boolean => {
      return !obj || obj.themeName !== CreatorThemeModel.defautlThemeName;
    },
    onPropertyEditorUpdate: function (obj: any, editor: any) {
      if (!!editor) {
        editor.unit = "%";
        editor.min = 0;
        editor.step = 5;
        editor.title = getLocString("creatortheme.userInterfaceBaseUnit");
        editor.titleLocation = "left";
        editor.descriptionLocation = "hidden";
      }
    }
  }, {
    name: "--ctr-surface-base-unit",
    default: "8px",
    visible: false,
  }, {
    type: "spinedit",
    name: "surfaceScale",
    isSerializable: false,
    default: 100,
    enableIf: (obj: CreatorThemeModel): boolean => {
      return !obj || obj.themeName !== CreatorThemeModel.defautlThemeName;
    },
    onPropertyEditorUpdate: function (obj: any, editor: any) {
      if (!!editor) {
        editor.unit = "%";
        editor.min = 0;
        editor.step = 5;
        editor.title = getLocString("creatortheme.surfaceScale");
        editor.titleLocation = "left";
        editor.descriptionLocation = "hidden";
      }
    }
  }, {
    name: "isLight:boolean",
    visible: false,
    isSerializable: false,
  },
]);