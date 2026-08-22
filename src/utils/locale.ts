export const LOCALE_STORAGE_KEY = 'cinemind.locale';

export const COMMON_LOCALES = [
  ['system', 'System / Browser'],
  ['en-US', 'English (US)'],
  ['es-DO', 'Español (República Dominicana)'],
  ['es-ES', 'Español (España)'],
  ['fr-FR', 'Français'],
  ['pt-BR', 'Português (Brasil)'],
  ['de-DE', 'Deutsch'],
  ['it-IT', 'Italiano'],
  ['ja-JP', '日本語'],
  ['ko-KR', '한국어'],
] as const;

export function detectedLocale(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  return navigator.languages?.[0] || navigator.language || 'en-US';
}

export function getPreferredLocale(): string {
  if (typeof window === 'undefined') return 'en-US';
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return !saved || saved === 'system' ? detectedLocale() : saved;
}

export function getLocaleMode(): string {
  if (typeof window === 'undefined') return 'system';
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) || 'system';
}

export function setPreferredLocale(locale: string): void {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale || 'system');
  document.documentElement.lang = locale === 'system' ? detectedLocale() : locale;
  window.dispatchEvent(new CustomEvent('cinemind:locale', { detail: getPreferredLocale() }));
}

export function baseLanguage(locale = getPreferredLocale()): string {
  return (locale || 'en').split('-')[0].toLowerCase();
}

type UiKey =
  | 'home' | 'series' | 'movies' | 'universes' | 'myList' | 'directorStudio' | 'create'
  | 'language' | 'systemLanguage' | 'otherLanguage' | 'generatedScene' | 'storyboard' | 'screenplay'
  | 'generateScene' | 'renderEpisode' | 'renderingEpisode' | 'subtitles' | 'episodeCut';

const UI: Record<string, Partial<Record<UiKey, string>>> = {
  en: { home:'Home', series:'Series', movies:'Movies', universes:'My Universes', myList:'My List', directorStudio:'Director Studio', create:'Create', language:'Language', systemLanguage:'System / Browser', otherLanguage:'Other language…', generatedScene:'Generated Scene', storyboard:'Storyboard', screenplay:'Screenplay', generateScene:'Generate Veo Scene', renderEpisode:'Render Episode Cut', renderingEpisode:'Rendering episode…', subtitles:'Subtitles', episodeCut:'Episode Cut' },
  es: { home:'Inicio', series:'Series', movies:'Películas', universes:'Mis universos', myList:'Mi lista', directorStudio:'Estudio de dirección', create:'Crear', language:'Idioma', systemLanguage:'Sistema / Navegador', otherLanguage:'Otro idioma…', generatedScene:'Escena generada', storyboard:'Storyboard', screenplay:'Guion', generateScene:'Generar escena con Veo', renderEpisode:'Renderizar corte del episodio', renderingEpisode:'Renderizando episodio…', subtitles:'Subtítulos', episodeCut:'Corte del episodio' },
  fr: { home:'Accueil', series:'Séries', movies:'Films', universes:'Mes univers', myList:'Ma liste', directorStudio:'Studio de réalisation', create:'Créer', language:'Langue', systemLanguage:'Système / Navigateur', otherLanguage:'Autre langue…', generatedScene:'Scène générée', storyboard:'Storyboard', screenplay:'Scénario', generateScene:'Générer la scène Veo', renderEpisode:"Rendre l'épisode", renderingEpisode:'Rendu de l’épisode…', subtitles:'Sous-titres', episodeCut:'Montage épisode' },
  pt: { home:'Início', series:'Séries', movies:'Filmes', universes:'Meus universos', myList:'Minha lista', directorStudio:'Estúdio de direção', create:'Criar', language:'Idioma', systemLanguage:'Sistema / Navegador', otherLanguage:'Outro idioma…', generatedScene:'Cena gerada', storyboard:'Storyboard', screenplay:'Roteiro', generateScene:'Gerar cena Veo', renderEpisode:'Renderizar episódio', renderingEpisode:'Renderizando episódio…', subtitles:'Legendas', episodeCut:'Corte do episódio' },
  de: { home:'Start', series:'Serien', movies:'Filme', universes:'Meine Universen', myList:'Meine Liste', directorStudio:'Regiestudio', create:'Erstellen', language:'Sprache', systemLanguage:'System / Browser', otherLanguage:'Andere Sprache…', generatedScene:'Generierte Szene', storyboard:'Storyboard', screenplay:'Drehbuch', generateScene:'Veo-Szene erzeugen', renderEpisode:'Episoden-Cut rendern', renderingEpisode:'Episode wird gerendert…', subtitles:'Untertitel', episodeCut:'Episoden-Cut' },
  it: { home:'Home', series:'Serie', movies:'Film', universes:'I miei universi', myList:'La mia lista', directorStudio:'Studio regia', create:'Crea', language:'Lingua', systemLanguage:'Sistema / Browser', otherLanguage:'Altra lingua…', generatedScene:'Scena generata', storyboard:'Storyboard', screenplay:'Sceneggiatura', generateScene:'Genera scena Veo', renderEpisode:'Renderizza episodio', renderingEpisode:'Rendering episodio…', subtitles:'Sottotitoli', episodeCut:'Montaggio episodio' },
  ja: { home:'ホーム', series:'シリーズ', movies:'映画', universes:'マイユニバース', myList:'マイリスト', directorStudio:'ディレクタースタジオ', create:'作成', language:'言語', systemLanguage:'システム / ブラウザ', otherLanguage:'その他の言語…', generatedScene:'生成シーン', storyboard:'絵コンテ', screenplay:'脚本', generateScene:'Veoシーンを生成', renderEpisode:'エピソードをレンダリング', renderingEpisode:'エピソードをレンダリング中…', subtitles:'字幕', episodeCut:'エピソードカット' },
  ko: { home:'홈', series:'시리즈', movies:'영화', universes:'내 유니버스', myList:'내 목록', directorStudio:'디렉터 스튜디오', create:'만들기', language:'언어', systemLanguage:'시스템 / 브라우저', otherLanguage:'다른 언어…', generatedScene:'생성된 장면', storyboard:'스토리보드', screenplay:'각본', generateScene:'Veo 장면 생성', renderEpisode:'에피소드 렌더링', renderingEpisode:'에피소드 렌더링 중…', subtitles:'자막', episodeCut:'에피소드 컷' },
};

export function t(key: UiKey, locale = getPreferredLocale()): string {
  const lang = baseLanguage(locale);
  return UI[lang]?.[key] || UI.en[key] || key;
}
