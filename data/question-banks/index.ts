import { campusBank } from "./campus";
import { dataAnalysisBank } from "./data-analysis";
import { ecommerceBank } from "./ecommerce";
import { educationBank } from "./education";
import { englishBank } from "./english";
import { financeBank } from "./finance";
import { generalBank } from "./general";
import { hrAdminBank } from "./hr-admin";
import { liveBank } from "./live";
import { operationsBank } from "./operations";
import { productBank } from "./product";
import { salesBank } from "./sales";
import { serviceBank } from "./service";
import { techBank } from "./tech";

export const interviewBanks = [
  generalBank,
  campusBank,
  operationsBank,
  ecommerceBank,
  liveBank,
  salesBank,
  serviceBank,
  hrAdminBank,
  productBank,
  techBank,
  dataAnalysisBank,
  financeBank,
  educationBank,
  englishBank,
];

export type { InterviewBank, InterviewQuestion, InterviewRound } from "./types";
