import { ParsedMarker, AnyMarkerData, MarkerType, RGBA } from "@shared/types";
import { MARKER_COLORS } from "@shared/constants";
import markerTemplate from '../../data/templates/marker.md';
import flagTemplate from '../../data/templates/flag.md';

/**
 * Конвертировать распарсенный маркер в данные для отображения
 */
export function convertParsedToMarkerData(parsedMarker: ParsedMarker): AnyMarkerData {
  const { backgroundColor, textColor, iconName } = getMarkerStyle(parsedMarker.type);

  return {
    id: parsedMarker.id,
    name: parsedMarker.displayName,
    type: parsedMarker.type === 'marker' ? MarkerType.MARKER :
      parsedMarker.type === 'flag' ? MarkerType.FLAG :
        parsedMarker.type === 'gateway' ? MarkerType.GATEWAY : MarkerType.WAYPOINT,
    position: parsedMarker.position,
    floor: parsedMarker.floorNumber || 1,
    roomId: parsedMarker.roomId,
    iconName,
    backgroundColor,
    textColor,
    connections: parsedMarker.connections.map(targetId => ({
      fromId: parsedMarker.id,
      toId: targetId,
      direction: 'two-way' as const
    })),
    description: generateDescription(parsedMarker),
    accessRights: parsedMarker.metadata.accessRights ?? [],
    requiredRole: parsedMarker.metadata.requiredRole,
    hasAccess: parsedMarker.type === 'gateway' ? false : true,
    isBlocked: parsedMarker.type === 'gateway',
    blockedMessage: parsedMarker.type === 'gateway' ? 'Нет доступа' : undefined
  };
}

/**
 * Получить стиль маркера (цвета и иконка) по типу
 */
function getMarkerStyle(type: string): { backgroundColor: RGBA; textColor: RGBA; iconName: string } {
  // Маппинг строковых типов на ключи MARKER_COLORS
  const colorKey = type.toUpperCase() as keyof typeof MARKER_COLORS;
  const colors = MARKER_COLORS[colorKey] ?? MARKER_COLORS.MARKER;

  return {
    backgroundColor: colors.background,
    textColor: colors.text,
    iconName: type === 'marker'
      ? 'location_on'
      : type === 'flag'
        ? 'flag'
        : type === 'gateway'
          ? 'gateway-blocked'
          : 'circle'
  };
}

/**
 * Сгенерировать описание маркера из шаблона
 */
function generateDescription(parsedMarker: ParsedMarker): string {
  if (parsedMarker.type === 'waypoint') {
    return '';
  }

  if (parsedMarker.type === 'flag') {
    return generateFlagDescription(parsedMarker);
  }

  if (parsedMarker.type === 'gateway') {
    return '';
  }

  return markerTemplate
    .replace('{{NAME}}', parsedMarker.displayName)
    .replace('{{DESCRIPTION}}', `Краткое описание для "${parsedMarker.displayName}".`);
}

/**
 * Сгенерировать описание для флага с QR-кодом
 */
function generateFlagDescription(parsedMarker: ParsedMarker): string {
  const flagName = parsedMarker.displayName || `Флаг ${parsedMarker.metadata?.number || 'unknown'}`;
  const qrUrl = parsedMarker.metadata?.qr || `https://example.com/flag/${parsedMarker.metadata?.number || 'unknown'}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

  return flagTemplate
    .replace('{{FLAG_NAME}}', flagName)
    .replace('{{QR_IMAGE}}', `![QR-код](${qrImageUrl})`)
    .replace(/{{\w+}}/g, '');
}
