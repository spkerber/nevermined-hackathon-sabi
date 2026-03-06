#!/usr/bin/env node

import { Command } from "commander";
import { initCmd } from "./commands/init.js";
import { verifyCmd } from "./commands/verify.js";
import { statusCmd } from "./commands/status.js";
import { listCmd } from "./commands/list.js";
import { watchCmd } from "./commands/watch.js";
import { configCmd } from "./commands/config.js";

const program = new Command();

program
  .name("sabi")
  .description("Sabi CLI — verification-as-a-service powered by Nevermined")
  .version("0.1.0");

program.addCommand(initCmd);
program.addCommand(verifyCmd);
program.addCommand(statusCmd);
program.addCommand(listCmd);
program.addCommand(watchCmd);
program.addCommand(configCmd);

program.parse();
