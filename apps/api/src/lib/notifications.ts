/**
 * SafeRoute Notification Engine
 * Handles FCM push notifications, BullMQ workers, and notification logging
 */

import { prisma } from './prisma';
import { logger } from './logger';

// Types
export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal';
  type: NotificationType;
}

export type NotificationType =
  | 'STOP_ARRIVED'
  | 'STOP_APPROACHING'
  | 'ROUTE_DEVIATION'
  | 'SOS'
  | 'TRIP_STARTED'
  | 'TRIP_ENDED'
  | 'ATTENDANCE_MARKED'
  | 'GENERAL';

export interface FCMToken {
  token: string;
  device?: string;
  userId: string;
}

/**
 * Notification Service - Main class for handling notifications
 */
export class NotificationService {
  private fcmApiKey: string | null;

  constructor() {
    this.fcmApiKey = process.env.FCM_SERVER_KEY || null;
  }

  /**
   * Register FCM token for a user
   */
  async registerToken(userId: string, token: string, device?: string): Promise<void> {
    try {
      // Check if token already exists
      const existing = await prisma.fcmToken.findUnique({
        where: { token }
      });

      if (existing) {
        // Update user association if different
        if (existing.userId !== userId) {
          await prisma.fcmToken.update({
            where: { token },
            data: { userId, device }
          });
        }
        return;
      }

      // Create new token
      await prisma.fcmToken.create({
        data: {
          token,
          userId,
          device: device || 'unknown'
        }
      });

      logger.info(`FCM token registered for user ${userId}`);
    } catch (error) {
      logger.error('Failed to register FCM token:', error);
      throw error;
    }
  }

  /**
   * Remove FCM token
   */
  async unregisterToken(token: string): Promise<void> {
    try {
      await prisma.fcmToken.delete({
        where: { token }
      });
      logger.info('FCM token unregistered');
    } catch (error) {
      logger.error('Failed to unregister FCM token:', error);
    }
  }

  /**
   * Get user's FCM tokens
   */
  async getUserTokens(userId: string): Promise<FCMToken[]> {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId }
    });

    return tokens.map(t => ({
      token: t.token,
      device: t.device || undefined,
      userId: t.userId
    }));
  }

  /**
   * Send notification to a single user
   */
  async sendToUser(payload: NotificationPayload): Promise<boolean> {
    try {
      // Get user's FCM tokens
      const tokens = await this.getUserTokens(payload.userId);

      if (tokens.length === 0) {
        logger.warn(`No FCM tokens found for user ${payload.userId}`);
        return false;
      }

      // Send to all user devices
      const results = await Promise.all(
        tokens.map(token => this.sendFCM(token.token, payload))
      );

      // Log notification
      await this.logNotification(payload, results.some(r => r.success));

      return results.some(r => r.success);
    } catch (error) {
      logger.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: Omit<NotificationPayload, 'userId'>): Promise<void> {
    await Promise.all(
      userIds.map(userId =>
        this.sendToUser({ ...payload, userId })
      )
    );
  }

  /**
   * Send FCM notification
   */
  private async sendFCM(token: string, payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    if (!this.fcmApiKey) {
      logger.warn('FCM_SERVER_KEY not configured, notification not sent');
      return { success: false, error: 'FCM not configured' };
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.fcmApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: token,
          priority: payload.priority || 'normal',
          notification: {
            title: payload.title,
            body: payload.body,
            sound: payload.priority === 'high' ? 'default' : undefined,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          data: {
            ...payload.data,
            type: payload.type,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('FCM send failed:', error);
        return { success: false, error };
      }

      const result = (await response.json()) as { success?: number; results?: Array<{ error?: string }> };

      // Check for invalid tokens
      if (result.results && result.results[0]?.error === 'NotRegistered') {
        await this.unregisterToken(token);
      }

      return { success: result.success === 1 };
    } catch (error) {
      logger.error('FCM send error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    payload: NotificationPayload,
    delivered: boolean
  ): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          delivered,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to log notification:', error);
    }
  }

  /**
   * Notify parents about stop arrival
   */
  async notifyStopArrival(stopId: string, stopName: string, tripId: string): Promise<void> {
    // Get parents at this stop
    const students = await prisma.student.findMany({
      where: { stopId },
      include: { parent: true }
    });

    const parentIds = [...new Set(students.map(s => s.parentId))];

    await this.sendToUsers(parentIds, {
      type: 'STOP_ARRIVED',
      title: '🚌 Bus Arrived',
      body: `The bus has arrived at ${stopName}`,
      priority: 'high',
      data: { stopId, stopName, tripId, type: 'STOP_ARRIVED' }
    });
  }

  /**
   * Notify parents about approaching stop
   */
  async notifyStopApproaching(stopId: string, stopName: string, tripId: string, eta: number): Promise<void> {
    const students = await prisma.student.findMany({
      where: { stopId },
      include: { parent: true }
    });

    const parentIds = [...new Set(students.map(s => s.parentId))];

    await this.sendToUsers(parentIds, {
      type: 'STOP_APPROACHING',
      title: '🚌 Bus Approaching',
      body: `Bus will arrive at ${stopName} in ${eta} minutes`,
      priority: 'normal',
      data: { stopId, stopName, tripId, eta, type: 'STOP_APPROACHING' }
    });
  }

  /**
   * Notify admins and parents about route deviation
   */
  async notifyRouteDeviation(tripId: string, distance: number, schoolId: string): Promise<void> {
    // Notify school admins
    const admins = await prisma.user.findMany({
      where: { schoolId, role: 'ADMIN' }
    });

    await this.sendToUsers(
      admins.map(a => a.id),
      {
        type: 'ROUTE_DEVIATION',
        title: '⚠️ Route Deviation',
        body: `Bus is ${Math.round(distance)}m off the planned route`,
        priority: 'high',
        data: { tripId, distance, type: 'ROUTE_DEVIATION' }
      }
    );
  }

  /**
   * Send SOS alert to all relevant parties
   */
  async sendSOSAlert(tripId: string, driverId: string, message: string, schoolId: string): Promise<void> {
    // Get school admins
    const admins = await prisma.user.findMany({
      where: { schoolId, role: 'ADMIN' }
    });

    // Get parents of students on this trip
    const attendance = await prisma.attendance.findMany({
      where: { tripId },
      include: { student: true }
    });

    const parentIds = [...new Set(attendance.map(a => a.student.parentId))];

    const allRecipients = [...new Set([...admins.map(a => a.id), ...parentIds])];

    await this.sendToUsers(allRecipients, {
      type: 'SOS',
      title: '🆘 EMERGENCY ALERT',
      body: message || 'Driver sent an SOS alert',
      priority: 'high',
      data: { tripId, driverId, message, type: 'SOS' }
    });
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId: string, limit: number = 50): Promise<any[]> {
    return await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();

/**
 * Setup FCM token registration endpoint
 */
export async function registerFCMToken(userId: string, token: string, device?: string): Promise<void> {
  return notificationService.registerToken(userId, token, device);
}

/**
 * Notify stop arrival
 */
export async function notifyStopArrival(stopId: string, stopName: string, tripId: string): Promise<void> {
  return notificationService.notifyStopArrival(stopId, stopName, tripId);
}

/**
 * Notify stop approaching
 */
export async function notifyStopApproaching(stopId: string, stopName: string, tripId: string, eta: number): Promise<void> {
  return notificationService.notifyStopApproaching(stopId, stopName, tripId, eta);
}

/**
 * Notify route deviation
 */
export async function notifyRouteDeviation(tripId: string, distance: number, schoolId: string): Promise<void> {
  return notificationService.notifyRouteDeviation(tripId, distance, schoolId);
}

/**
 * Send SOS alert
 */
export async function sendSOSAlert(tripId: string, driverId: string, message: string, schoolId: string): Promise<void> {
  return notificationService.sendSOSAlert(tripId, driverId, message, schoolId);
}
