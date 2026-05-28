export type TriggerType =
  | "grocery.item.completed"
  | "grocery.item.stock_changed";

export type ActionType =
  | "grocery.setStockStatus"
  | "grocery.addTag"
  | "grocery.moveToPantry";

export interface AutomationRow {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  sort_order: number;
  last_run_at: string | null;
}

export interface TriggerContext {
  userId: string;
  /** Trigger-specific payload, e.g. { item: GroceryItem } */
  payload: Record<string, any>;
}