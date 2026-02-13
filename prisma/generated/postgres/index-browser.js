
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  sku: 'sku',
  name: 'name',
  description: 'description',
  priceCents: 'priceCents',
  currency: 'currency',
  durationDays: 'durationDays',
  grantPoints: 'grantPoints',
  grantVipRole: 'grantVipRole',
  mtaActions: 'mtaActions',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  code: 'code',
  percentOff: 'percentOff',
  amountOffCents: 'amountOffCents',
  maxUses: 'maxUses',
  uses: 'uses',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.PurchaseItemScalarFieldEnum = {
  id: 'id',
  purchaseId: 'purchaseId',
  productId: 'productId',
  sku: 'sku',
  name: 'name',
  priceCents: 'priceCents',
  durationDays: 'durationDays',
  grantPoints: 'grantPoints',
  grantVipRole: 'grantVipRole',
  mtaActions: 'mtaActions'
};

exports.Prisma.EntitlementScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  roleName: 'roleName',
  expiresAt: 'expiresAt',
  source: 'source',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  message: 'message',
  href: 'href',
  read: 'read',
  createdAt: 'createdAt'
};

exports.Prisma.StaffShiftScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  openedAt: 'openedAt',
  closedAt: 'closedAt',
  seconds: 'seconds',
  createdAt: 'createdAt'
};

exports.Prisma.StaffWeeklyRewardScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  position: 'position',
  weekKey: 'weekKey',
  createdAt: 'createdAt'
};

exports.Prisma.AdminCaseScalarFieldEnum = {
  id: 'id',
  targetUserId: 'targetUserId',
  staffUserId: 'staffUserId',
  type: 'type',
  reason: 'reason',
  expiresAt: 'expiresAt',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.UserReputationScalarFieldEnum = {
  userId: 'userId',
  score: 'score',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  username: 'username',
  passwordHash: 'passwordHash',
  emailVerifiedAt: 'emailVerifiedAt',
  emailVerifyToken: 'emailVerifyToken',
  emailVerifyExpiresAt: 'emailVerifyExpiresAt',
  phone: 'phone',
  recoveryEmail: 'recoveryEmail',
  googleId: 'googleId',
  discordId: 'discordId',
  discordUsername: 'discordUsername',
  avatarKey: 'avatarKey',
  role: 'role',
  isDeleted: 'isDeleted',
  bannedUntil: 'bannedUntil',
  whitelistStatus: 'whitelistStatus',
  points: 'points',
  lastSeenAt: 'lastSeenAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  avatarUrl: 'avatarUrl'
};

exports.Prisma.ForumCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.ForumBoardScalarFieldEnum = {
  id: 'id',
  categoryId: 'categoryId',
  name: 'name',
  description: 'description',
  order: 'order',
  requireWhitelist: 'requireWhitelist',
  pointsOnTopic: 'pointsOnTopic',
  pointsOnReply: 'pointsOnReply',
  allowReplies: 'allowReplies',
  createdAt: 'createdAt'
};

exports.Prisma.TopicScalarFieldEnum = {
  id: 'id',
  boardId: 'boardId',
  authorId: 'authorId',
  title: 'title',
  status: 'status',
  pinned: 'pinned',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastPostAt: 'lastPostAt'
};

exports.Prisma.PostScalarFieldEnum = {
  id: 'id',
  topicId: 'topicId',
  authorId: 'authorId',
  content: 'content',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PostAttachmentScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  url: 'url',
  mime: 'mime',
  size: 'size',
  createdAt: 'createdAt'
};

exports.Prisma.TicketCategoryScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  description: 'description',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.TicketScalarFieldEnum = {
  id: 'id',
  categoryId: 'categoryId',
  authorId: 'authorId',
  title: 'title',
  status: 'status',
  priority: 'priority',
  assignedToId: 'assignedToId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  closedAt: 'closedAt',
  closedById: 'closedById'
};

exports.Prisma.TicketMessageScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  authorId: 'authorId',
  content: 'content',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt'
};

exports.Prisma.PurchaseScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  provider: 'provider',
  externalId: 'externalId',
  status: 'status',
  amountCents: 'amountCents',
  currency: 'currency',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  ip: 'ip',
  userAgent: 'userAgent',
  meta: 'meta',
  createdAt: 'createdAt'
};

exports.Prisma.MpWebhookEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  externalId: 'externalId',
  payload: 'payload',
  processed: 'processed',
  createdAt: 'createdAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  rank: 'rank',
  description: 'description',
  createdAt: 'createdAt',
  colorHex: 'colorHex'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  key: 'key',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  roleId: 'roleId',
  permissionId: 'permissionId'
};

exports.Prisma.UserRoleScalarFieldEnum = {
  userId: 'userId',
  roleId: 'roleId'
};

exports.Prisma.WhitelistConfigScalarFieldEnum = {
  id: 'id',
  enabled: 'enabled',
  pausedUntil: 'pausedUntil',
  successTitle: 'successTitle',
  successBody: 'successBody',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WhitelistQuestionScalarFieldEnum = {
  id: 'id',
  prompt: 'prompt',
  required: 'required',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.WhitelistApplicationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  reviewerId: 'reviewerId',
  rejectReason: 'rejectReason',
  createdAt: 'createdAt',
  reviewedAt: 'reviewedAt'
};

exports.Prisma.WhitelistAnswerScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  questionId: 'questionId',
  value: 'value',
  createdAt: 'createdAt'
};

exports.Prisma.BadgeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  createdAt: 'createdAt'
};

exports.Prisma.UserBadgeScalarFieldEnum = {
  userId: 'userId',
  badgeId: 'badgeId',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConversationParticipantScalarFieldEnum = {
  conversationId: 'conversationId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.DirectMessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  senderId: 'senderId',
  receiverId: 'receiverId',
  content: 'content',
  kind: 'kind',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt'
};

exports.Prisma.BankInfoScalarFieldEnum = {
  id: 'id',
  label: 'label',
  holderName: 'holderName',
  pixKey: 'pixKey',
  bankName: 'bankName',
  agency: 'agency',
  accountNumber: 'accountNumber',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SiteSettingScalarFieldEnum = {
  key: 'key',
  value: 'value',
  updatedAt: 'updatedAt'
};

exports.Prisma.GameAccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  mtaSerial: 'mtaSerial',
  mtaAccount: 'mtaAccount',
  locked: 'locked',
  changedAfterApproved: 'changedAfterApproved',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketParticipantScalarFieldEnum = {
  ticketId: 'ticketId',
  userId: 'userId',
  addedById: 'addedById',
  createdAt: 'createdAt'
};

exports.Prisma.TicketRatingScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  raterUserId: 'raterUserId',
  targetUserId: 'targetUserId',
  stars: 'stars',
  feedback: 'feedback',
  createdAt: 'createdAt'
};

exports.Prisma.MtaAccessLogScalarFieldEnum = {
  id: 'id',
  serial: 'serial',
  userId: 'userId',
  allowed: 'allowed',
  reason: 'reason',
  ip: 'ip',
  createdAt: 'createdAt'
};

exports.Prisma.TicketRatingRequirementScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  raterId: 'raterId',
  targetId: 'targetId',
  completed: 'completed',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  code: 'code',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Product: 'Product',
  Coupon: 'Coupon',
  PurchaseItem: 'PurchaseItem',
  Entitlement: 'Entitlement',
  Notification: 'Notification',
  StaffShift: 'StaffShift',
  StaffWeeklyReward: 'StaffWeeklyReward',
  AdminCase: 'AdminCase',
  UserReputation: 'UserReputation',
  User: 'User',
  ForumCategory: 'ForumCategory',
  ForumBoard: 'ForumBoard',
  Topic: 'Topic',
  Post: 'Post',
  PostAttachment: 'PostAttachment',
  TicketCategory: 'TicketCategory',
  Ticket: 'Ticket',
  TicketMessage: 'TicketMessage',
  Purchase: 'Purchase',
  AuditLog: 'AuditLog',
  MpWebhookEvent: 'MpWebhookEvent',
  Role: 'Role',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  UserRole: 'UserRole',
  WhitelistConfig: 'WhitelistConfig',
  WhitelistQuestion: 'WhitelistQuestion',
  WhitelistApplication: 'WhitelistApplication',
  WhitelistAnswer: 'WhitelistAnswer',
  Badge: 'Badge',
  UserBadge: 'UserBadge',
  Conversation: 'Conversation',
  ConversationParticipant: 'ConversationParticipant',
  DirectMessage: 'DirectMessage',
  BankInfo: 'BankInfo',
  SiteSetting: 'SiteSetting',
  GameAccount: 'GameAccount',
  TicketParticipant: 'TicketParticipant',
  TicketRating: 'TicketRating',
  MtaAccessLog: 'MtaAccessLog',
  TicketRatingRequirement: 'TicketRatingRequirement',
  PasswordResetToken: 'PasswordResetToken'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
