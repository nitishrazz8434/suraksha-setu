"use client";
import{createContext,useContext}from"react";
import type{Report,Workspace}from"../../lib/types";
export interface ReportDraft{text?:string;analysis?:Report["analysis"];file?:File;}
import type {Monitoring} from "../../lib/connected-types";
export interface AppContextValue{monitor:Monitoring;w:Workspace;update:(fn:(w:Workspace)=>Workspace)=>void;notify:(text:string)=>void;navigate:(view:string)=>void;openReport:(draft?:ReportDraft)=>void;loaded:boolean;action:(data:{type:"approve"|"start"|"arrive"|"cancel";planId:string;householdId?:string})=>Promise<void>;}
export const AppContext=createContext<AppContextValue|null>(null);
export function useApp(){const value=useContext(AppContext);if(!value)throw new Error("Workspace context missing");return value;}
