const globalForNotifications = globalThis as typeof globalThis & {
  notificationEventBus?: EventTarget;
};

const notificationEventBus =
  globalForNotifications.notificationEventBus ?? new EventTarget();

globalForNotifications.notificationEventBus = notificationEventBus;

function getNotificationChannelName(userId: string) {
  return `notifications:${userId}`;
}

function getPostActivityChannelName(postId: string) {
  return `post-activity:${postId}`;
}

function getChannelActivityChannelName(channelId: string) {
  return `channel-activity:${channelId}`;
}

function publish(channelName: string) {
  notificationEventBus.dispatchEvent(new Event(channelName));
}

function subscribe(channelName: string, listener: () => void) {
  notificationEventBus.addEventListener(channelName, listener);

  return () => {
    notificationEventBus.removeEventListener(channelName, listener);
  };
}

export function publishNotificationRefresh(userIds: Iterable<string>) {
  const uniqueUserIds = new Set(userIds);

  for (const userId of uniqueUserIds) {
    publish(getNotificationChannelName(userId));
  }
}

export function subscribeToNotificationRefresh(
  userId: string,
  listener: () => void,
) {
  return subscribe(getNotificationChannelName(userId), listener);
}

export function publishPostActivity(postId: string) {
  publish(getPostActivityChannelName(postId));
}

export function subscribeToPostActivity(postId: string, listener: () => void) {
  return subscribe(getPostActivityChannelName(postId), listener);
}

export function publishChannelActivity(channelId: string) {
  publish(getChannelActivityChannelName(channelId));
}

export function subscribeToChannelActivity(
  channelId: string,
  listener: () => void,
) {
  return subscribe(getChannelActivityChannelName(channelId), listener);
}
