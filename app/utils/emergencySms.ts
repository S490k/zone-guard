import * as SMS from 'expo-sms';

/**
 * SMS fallback for reaching contacts when data is unavailable.
 *
 * In a disaster, cellular SMS commonly survives after data networks are
 * saturated or down, so a pre-composed text is a meaningful last resort. The
 * app never sends anything itself: it opens the system composer with the
 * message and lets the user choose recipients and press send. Nothing leaves
 * the device without an explicit action.
 */

export interface EmergencyContext {
  latitude?: number;
  longitude?: number;
  /** Zones the user is currently inside, most serious first. */
  zoneNames: string[];
  timestamp: Date;
}

export interface MessageLabels {
  intro: string;
  at: string;
  inZone: string;
  noLocation: string;
  sentAt: string;
}

/** Map link any recipient can open, regardless of their device. */
export function mapLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

/**
 * Builds the message body. Pure, so the wording can be verified without
 * opening a composer — and so it stays translatable.
 */
export function composeEmergencyMessage(
  context: EmergencyContext,
  labels: MessageLabels
): string {
  const lines: string[] = [labels.intro];

  if (context.latitude !== undefined && context.longitude !== undefined) {
    lines.push(
      `${labels.at} ${context.latitude.toFixed(5)}, ${context.longitude.toFixed(5)}`
    );
    lines.push(mapLink(context.latitude, context.longitude));
  } else {
    lines.push(labels.noLocation);
  }

  if (context.zoneNames.length > 0) {
    lines.push(`${labels.inZone} ${context.zoneNames.join(', ')}`);
  }

  lines.push(`${labels.sentAt} ${context.timestamp.toLocaleString()}`);

  return lines.join('\n');
}

export type SmsOutcome = 'sent' | 'cancelled' | 'unavailable' | 'failed';

/** Opens the system composer. Returns what the user did, not what we sent. */
export async function sendEmergencySms(message: string): Promise<SmsOutcome> {
  try {
    if (!(await SMS.isAvailableAsync())) return 'unavailable';

    // No recipients: the user picks them in the composer, so the app never
    // holds a contact list and needs no contacts permission.
    const { result } = await SMS.sendSMSAsync([], message);
    return result === 'sent' ? 'sent' : 'cancelled';
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[EmergencySMS] Composer failed:', detail);
    return 'failed';
  }
}
