import { CreatorBase } from "./creator-base";
import { SurveyElementAdornerBase } from "./components/action-container-view-model";

export class ExpandCollapseManager {
  constructor(creator: CreatorBase) {
    creator.onSurfaceToolbarActionExecuted.add((_, options) => {
      const isCollapseAction = options.action.id == "collapseAll";
      const isExpandAction = options.action.id == "expandAll";
      if (isCollapseAction || isExpandAction) {
        this.updateCollapsed(isCollapseAction);
      }
    });
  }
  private adorners: Array<SurveyElementAdornerBase> = [];
  public updateCollapsed(isCollapsed: boolean) {
    for (let i = this.adorners.length - 1; i >= 0; i--) {
      if (this.adorners[i].allowExpandCollapse) {
        this.adorners[i].collapsed = isCollapsed;
      }
    }
  }

  public add(adorner: SurveyElementAdornerBase) {
    this.adorners.push(adorner);
  }
  public remove(adorner: SurveyElementAdornerBase) {
    this.adorners.splice(this.adorners.indexOf(adorner), 1);
  }
}