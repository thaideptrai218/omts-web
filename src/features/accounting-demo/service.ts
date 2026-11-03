import { createDemoAccountingRepository } from "./repository";

const repository = createDemoAccountingRepository();

export const demoAccountingService = Object.freeze({
  load: repository.load,
  pay: repository.pay,
  submit: repository.submit,
});
