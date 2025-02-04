import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { User, UserSession } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import type { CookieOptions, Request, Response } from 'express';
import { assign, pick } from 'lodash-es';


@Injectable()
export class TransferService{



  constructor() {}


  /**
   * This is a test only helper to quickly signup a user, do not use in production
   */



}
