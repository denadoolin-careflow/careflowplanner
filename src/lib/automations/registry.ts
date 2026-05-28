import { ShoppingBasket, Tag, Package, ArrowRightCircle } from "lucide-react";
import type { ActionType, TriggerType } from "./types";

export interface TriggerDef {
  type: TriggerType;
  label: string;
  description: string;
  icon: any;
  /** Domain/category label, e.g. "Grocery" */
  category: string;
}

export interface ActionDef {
  type: ActionType;
  label: string;
  description: string;
  icon: any;
  category: string;
  /** Default action_config when picking this action. */
  defaultConfig: Record<string, any>;
}

export const TRIGGERS: TriggerDef[] = [
  {
    type: "grocery.item.completed",
    label: "Grocery item checked off",
    description: "Fires when you mark a grocery item as bought.",
    icon: ShoppingBasket,
    category: "Grocery",
  },
  {
    type: "grocery.item.stock_changed",
    label: "Grocery stock status changed",
    description: "Fires when an item's stock changes (in / low / out).",
    icon: Package,
    category: "Grocery",
  },
];

export const ACTIONS: ActionDef[] = [
  {
    type: "grocery.moveToPantry",
    label: "Move to pantry (in stock)",
    description: "Marks the item in-stock, adds an 'in stock' tag, and moves it to the Pantry section.",
    icon: ArrowRightCircle,
    category: "Grocery",
    defaultConfig: { tag: "in stock", stockStatus: "in" },
  },
  {
    type: "grocery.addTag",
    label: "Add tag",
    description: "Attach a tag to the grocery item.",
    icon: Tag,
    category: "Grocery",
    defaultConfig: { tag: "in stock" },
  },
  {
    type: "grocery.setStockStatus",
    label: "Set stock status",
    description: "Change the item's stock status.",
    icon: Package,
    category: "Grocery",
    defaultConfig: { stockStatus: "in" },
  },
];

export const getTrigger = (t: TriggerType) => TRIGGERS.find(x => x.type === t);
export const getAction = (a: ActionType) => ACTIONS.find(x => x.type === a);