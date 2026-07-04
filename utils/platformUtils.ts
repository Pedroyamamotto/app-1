import { Platform } from 'react-native';

/**
 * Identifica se a plataforma atual é Web/PC.
 */
export const isWeb = Platform.OS === 'web';

interface FileData {
  uri: string;
  mimeType?: string;
  fileName?: string;
}

/**
 * Adiciona um arquivo ao FormData de forma compatível com Native e Web.
 * 
 * No Native, usa o objeto { uri, type, name }.
 * No Web, converte a URI em um Blob/File real para o FormData.
 */
export async function appendFileDataToForm(
  formData: FormData,
  key: string,
  fileData: FileData
): Promise<void> {
  if (!fileData.uri) return;

  if (isWeb) {
    try {
      // No Web, o FormData exige um objeto Blob ou File real.
      // Geralmente a URI do ImagePicker no Web é um blob: ou data:
      const response = await fetch(fileData.uri);
      const blob = await response.blob();
      
      const mimeType = fileData.mimeType || blob.type || 'image/jpeg';
      const fileName = fileData.fileName || 'upload.jpg';
      
      const file = new File([blob], fileName, { type: mimeType });
      formData.append(key, file);
    } catch (error) {
      console.error('[platformUtils] Erro ao converter URI para File no Web:', error);
      // Fallback: se falhar, tenta passar a URI (pode falhar no envio do form dependendo do backend)
      formData.append(key, fileData.uri);
    }
  } else {
    // No Native (Android/iOS), o React Native intercepta este objeto específico no FormData
    formData.append(key, {
      uri: fileData.uri,
      type: fileData.mimeType || 'image/jpeg',
      name: fileData.fileName || 'upload.jpg',
    } as any);
  }
}

/**
 * Adiciona uma string base64 (ex: data:image/png;base64,...) ao FormData.
 */
export async function appendBase64ToForm(
  formData: FormData,
  key: string,
  base64Data: string,
  fileName: string = 'assinatura.png'
): Promise<void> {
  if (!base64Data) return;

  if (isWeb) {
    try {
      const response = await fetch(base64Data);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      formData.append(key, file);
    } catch (error) {
      console.error('[platformUtils] Erro ao converter base64 para File no Web:', error);
      formData.append(key, base64Data);
    }
  } else {
    // No Native, o React Native fetch/FormData suporta data: URIs no campo uri.
    formData.append(key, {
      uri: base64Data,
      type: 'image/png',
      name: fileName,
    } as any);
  }
}

/**
 * Remove o caractere '=' que às vezes vem no início de textos do Bling (fórmula do Excel)
 * e também remove aspas ao redor caso existam.
 */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  if (str.startsWith('=')) {
    str = str.substring(1).trim();
  }
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.substring(1, str.length - 1).trim();
  }
  return str;
}

