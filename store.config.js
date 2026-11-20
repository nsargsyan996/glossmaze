// App Store listing for `eas metadata:push`. The texts come from store/listing.md, so that file stays the one place to
// edit them. Screenshots, App Privacy and the review contact are set in App Store Connect.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const LISTING = readFileSync(join(__dirname, 'store/listing.md'), 'utf8');
const SITE = 'https://nsargsyan996.github.io/glossmaze/';
const PRIVACY_URL = `${SITE}privacy.html`;

/** The ```text block under `### <field>` inside `## <section>` of listing.md. */
const field = (section, name) => {
  const body = LISTING.split(/^## /m).find((part) => part.startsWith(section));
  const match = body?.match(new RegExp(`^### ${name}[^\\n]*\\n+\`\`\`text\\n([\\s\\S]*?)\\n\`\`\``, 'm'));
  if (!match) throw new Error(`store/listing.md: no "${name}" under "${section}"`);
  return match[1].trim();
};

const info = (section) => ({
  title: field(section, 'App Store name'),
  subtitle: field(section, 'App Store subtitle'),
  promoText: field(section, 'App Store promotional text'),
  description: field(section, 'Full description'),
  keywords: field(section, 'App Store keywords').split(','),
  releaseNotes: field(section, "What's new"),
  marketingUrl: SITE,
  supportUrl: SITE,
  privacyPolicyUrl: PRIVACY_URL,
});

module.exports = {
  configVersion: 0,
  apple: {
    // Must match `version` in app.config.ts.
    version: '1.0.0',
    copyright: '2026 Narek Sargsyan',
    categories: [['GAMES', 'GAMES_PUZZLE', 'GAMES_CASUAL']],
    info: {
      'en-US': info('English'),
    },
    // Age rating 4+: everything "none"; the only "yes" is that the app shows ads.
    advisory: {
      alcoholTobaccoOrDrugUseOrReferences: 'NONE',
      contests: 'NONE',
      gamblingSimulated: 'NONE',
      gunsOrOtherWeapons: 'NONE',
      horrorOrFearThemes: 'NONE',
      matureOrSuggestiveThemes: 'NONE',
      medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE',
      sexualContentGraphicAndNudity: 'NONE',
      sexualContentOrNudity: 'NONE',
      violenceCartoonOrFantasy: 'NONE',
      violenceRealistic: 'NONE',
      violenceRealisticProlongedGraphicOrSadistic: 'NONE',
      gambling: false,
      lootBox: false,
      unrestrictedWebAccess: false,
      userGeneratedContent: false,
      messagingAndChat: false,
      parentalControls: false,
      ageAssurance: false,
      healthOrWellnessTopics: false,
      advertising: true,
      kidsAgeBand: null,
      ageRatingOverride: 'NONE',
      koreaAgeRatingOverride: 'NONE',
    },
    release: {
      automaticRelease: false,
    },
  },
};
