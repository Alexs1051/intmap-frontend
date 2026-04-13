import { ParsedMarker, AnyMarkerData, MarkerType, RGBA } from "../../shared/types";
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
      parsedMarker.type === 'flag' ? MarkerType.FLAG : MarkerType.WAYPOINT,
    position: parsedMarker.position,
    floor: parsedMarker.floorNumber || 1,
    iconName,
    backgroundColor,
    textColor,
    connections: parsedMarker.connections.map(targetId => ({
      fromId: parsedMarker.id,
      toId: targetId,
      direction: 'two-way' as const
    })),
    description: generateDescription(parsedMarker)
  };
}

/**
 * Получить стиль маркера (цвета и иконка) по типу
 */
function getMarkerStyle(type: string): { backgroundColor: RGBA; textColor: RGBA; iconName: string } {
  switch (type) {
    case 'marker':
      return {
        backgroundColor: { r: 0.2, g: 0.5, b: 0.8, a: 0.9 },
        textColor: { r: 0, g: 0.5, b: 0, a: 1 },
        iconName: 'location_on'
      };
    case 'flag':
      return {
        backgroundColor: { r: 0.9, g: 0.3, b: 0.2, a: 0.9 },
        textColor: { r: 1, g: 1, b: 1, a: 1 },
        iconName: 'flag'
      };
    case 'waypoint':
      return {
        backgroundColor: { r: 0.3, g: 0.7, b: 0.3, a: 0.9 },
        textColor: { r: 1, g: 1, b: 1, a: 1 },
        iconName: 'circle'
      };
    default:
      return {
        backgroundColor: { r: 0.2, g: 0.5, b: 0.8, a: 0.9 },
        textColor: { r: 1, g: 1, b: 1, a: 1 },
        iconName: '📍'
      };
  }
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
