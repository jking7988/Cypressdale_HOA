import { PortableText } from '@portabletext/react';
import ContentText from '@/components/content/ContentText';
import FileAttachment from '@/components/content/FileAttachment';
import RichTitle from '@/components/content/RichTitle';
import type { CSSProperties } from 'react';
import { assetUrl, type ContentRecord, type MediaAsset } from '@/lib/member-hub/content';
import ContentSidebar from './ContentSidebar';
import { sidebarOptions } from '@/lib/member-hub/sidebar';
import { portableTextComponents, normalizePortableTextValue } from '@/components/portableTextComponents';

function RichText({ value }: { value: any[] }) {
  return <div className="hub-rich-copy"><PortableText value={normalizePortableTextValue(value)} components={portableTextComponents} /></div>;
}
function sectionStyle(section: any): CSSProperties {
  const colors = (value: any) => typeof value === 'string' ? value : value?.hex;
  const background = colors(section.backgroundColor), end = colors(section.backgroundColorEnd);
  const directions: Record<string, string> = { vertical: 'to bottom', horizontal: 'to right', 'to bottom': 'to bottom', 'to top': 'to top', 'to left': 'to left', 'to right': 'to right' };
  const backgroundImage = assetUrl(section.backgroundImage);
  const images = [background && end ? `linear-gradient(${directions[section.gradientDirection] || 'to bottom'}, ${background}, ${end})` : null,
    backgroundImage ? `linear-gradient(rgba(255,255,255,${1 - (section.backgroundImageOpacity ?? .18)}),rgba(255,255,255,${1 - (section.backgroundImageOpacity ?? .18)})),url("${backgroundImage}")` : null].filter(Boolean);
  return { backgroundColor: background, backgroundImage: images.join(', ') || undefined, backgroundSize: 'cover', backgroundPosition: 'center',
    borderColor: colors(section.borderColor), textAlign: ['left', 'center', 'right'].includes(section.alignment) ? section.alignment : 'left' };
}
function titleStyle(section: any): CSSProperties {
  const sizes: Record<string, number> = { sm: 18, md: 20, lg: 24, xl: 30 };
  const weights: Record<string, number> = { medium: 500, semibold: 600, bold: 700, extrabold: 800 };
  const size = Number(section.titleSize) || sizes[section.titleSize] || 20;
  const weight = Number(section.titleWeight) || weights[section.titleWeight] || 600;
  return { color: section.titleColor?.hex, fontSize: Math.max(12, Math.min(64, size)), fontWeight: Math.max(100, Math.min(900, weight)) };
}

export default function ContentView({ content, assets = [] }: { content: ContentRecord; assets?: MediaAsset[] }) {
  const settings = content.settings;
  const hasSidebar = Object.values(sidebarOptions(content.kind, settings)).some(Boolean);
  const photos = settings.photos?.length ? settings.photos : settings.photo ? [settings.photo] : [];
  const attachment = settings.file || settings.flyer;
  const attachmentMime = assets.find(asset => asset.id === attachment?.asset?._ref)?.mime_type;
  return <div className={hasSidebar ? 'hub-read-columns' : ''}><article className={`hub-content-view hub-layout-${settings.layoutVariant || 'standard'}`}>
    <header><p className="hub-eyebrow">{content.visibility === 'members' ? 'Members Only' : 'Cypressdale HOA'}</p><RichTitle title={content.title} value={settings.titleRichText} /></header>
    {settings.description && <p className="hub-content-description"><ContentText>{settings.description}</ContentText></p>}
    {settings.location && <p className="hub-content-detail"><ContentText>{settings.location}</ContentText></p>}
    {(settings.startDate || settings.start) && <p className="hub-content-detail">{new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' }).format(new Date(settings.startDate || settings.start))}</p>}
    {settings.isMultiDayEvent && settings.secondStartDate && <p className="hub-content-detail">{new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' }).format(new Date(settings.secondStartDate))}</p>}
    {attachment && <div className="hub-content-attachment"><a className="hub-button hub-secondary" href={assetUrl(attachment)}>Download {content.kind === 'documentFile' ? 'Document' : 'Flyer'}</a>
      {settings.flyer && (attachmentMime?.startsWith('image/') || settings.flyer.asset?._ref?.startsWith('image-')) && <img src={assetUrl(settings.flyer)} alt={`${content.title} flyer`} />}
      {settings.flyer && attachmentMime === 'application/pdf' && <iframe className="hub-pdf-preview" src={`${assetUrl(settings.flyer)}?view=1`} title={`${content.title} flyer`} />}</div>}
    {content.kind === 'event' && <p className="hub-content-detail">{settings.rsvpYes || 0} going | {settings.rsvpMaybe || 0} maybe</p>}
    {!!content.body?.length && <RichText value={content.body} />}
    <div className="hub-page-sections">{content.sections.map((section, index) => <div key={section._key || index}>
      {section.showDividerAbove && <hr />}
      <section className={`hub-page-section hub-section-${section.width || 'default'} hub-spacing-${section.spacing || 'normal'} hub-border-${section.borderStyle || 'none'} hub-thickness-${section.borderThickness || 'thin'} ${section._type === 'imageWithText' ? 'hub-image-section' : ''}`} style={sectionStyle(section)}>
        {section._type === 'imageWithText' && section.imagePosition !== 'right' && assetUrl(section.image) && <img src={assetUrl(section.image)} alt={section.image?.alt || ''} />}
        <div>{section.topicLabel && <p className="hub-eyebrow">{section.icon} <ContentText>{section.topicLabel}</ContentText></p>}
          {section.title && <h2 style={titleStyle(section)}><ContentText>{section.title}</ContentText></h2>}
          {section._type === 'fileSection' ? <FileAttachment url={assetUrl(section.file)}
            mime={assets.find(asset => asset.id === section.file?.asset?._ref)?.mime_type}
            name={assets.find(asset => asset.id === section.file?.asset?._ref)?.original_filename} />
            : section.body && <RichText value={section.body} />}
        </div>
        {section._type === 'imageWithText' && section.imagePosition === 'right' && assetUrl(section.image) && <img src={assetUrl(section.image)} alt={section.image?.alt || ''} />}
      </section>
      {section.showDividerBelow && <hr />}
    </div>)}</div>
    {!!photos.length && <div className="hub-photo-gallery">{photos.map((photo: any, index: number) => <img key={photo._key || index} src={assetUrl(photo)} alt={photo.alt || `${content.title}, photo ${index + 1}`} />)}</div>}
    {(settings.month || settings.year || settings.place) && <p className="hub-content-detail">{[settings.month, settings.year, settings.holiday, settings.place ? `Place: ${settings.place}` : null, settings.streetOrBlock].filter(Boolean).join(' | ')}</p>}
  </article><ContentSidebar kind={content.kind} settings={settings} className="hub-reading-sidebar" /></div>;
}
