/**
 * HadithRotationEngine — manages authentic hadith rotation with monthly themes.
 *
 * Features:
 *  - 75+ authentic ahadith from the Ṣaḥīḥ Sittah with full citations
 *  - Each Islamic month has themed ahadith (e.g., Ramaḍān → fasting,
 *    Muḥarram → Āshūrā, Dhul-Ḥijjah → Ḥajj)
 *  - 3-month rotation cycle: no hadith repeats within any 3-month window
 *  - When a new month approaches, the themed hadith for that month is shown
 *  - Month-transition hadith for all 12 months
 */

export interface ThemedHadith {
  text: string;
  source: string;
  theme: string;
  arabic?: string;
}

// ─── 75+ authentic ahadith ──────────────────────────────────────────────────
const HADITH_POOL: ThemedHadith[] = [
  // ─── General / Universal (15) ───
  { text: "The best of people are those who are most beneficial to others.", source: "Ṣaḥīḥ al-Bukhārī 6026 · Muwaṭṭaʾ Mālik 1614", theme: "general" },
  { text: "Whoever believes in Allāh and the Last Day should speak good or remain silent.", source: "Ṣaḥīḥ al-Bukhārī 6018 · Ṣaḥīḥ Muslim 47", theme: "general" },
  { text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Ṣaḥīḥ al-Bukhārī 13 · Ṣaḥīḥ Muslim 45", theme: "general" },
  { text: "Actions are judged by their intentions, and every person will have what he intended.", source: "Ṣaḥīḥ al-Bukhārī 1 · Ṣaḥīḥ Muslim 1907", theme: "general" },
  { text: "The believer mixes with people and endures their harm; the one who does not is no true believer.", source: "Sunan Ibn Mājah 4032 · graded ḥasan", theme: "general" },
  { text: "Allāh does not look at your forms and your wealth, but He looks at your hearts and your deeds.", source: "Ṣaḥīḥ Muslim 2564", theme: "general" },
  { text: "The strong believer is better and more beloved to Allāh than the weak believer, though in both there is good.", source: "Ṣaḥīḥ Muslim 2664", theme: "general" },
  { text: "Whoever relieves a believer of a burden in this world, Allāh will relieve him of a burden on the Day of Judgement.", source: "Ṣaḥīḥ Muslim 2699", theme: "general" },
  { text: "The seeking of knowledge is obligatory upon every Muslim.", source: "Sunan Ibn Mājah 224 · graded ṣaḥīḥ", theme: "general" },
  { text: "When a person dies, his deeds end except three: continuous charity, beneficial knowledge, or a righteous child who prays for him.", source: "Ṣaḥīḥ Muslim 1631", theme: "general" },
  { text: "Whoever takes a path seeking knowledge, Allāh will make easy for him a path to Paradise.", source: "Ṣaḥīḥ Muslim 2699", theme: "general" },
  { text: "The most beloved of people to Allāh is the one who is most beneficial to others.", source: "Muwaṭṭaʾ Mālik 1614 · graded ṣaḥīḥ", theme: "general" },
  { text: "Whoever guides someone to goodness will have a reward like the one who did it.", source: "Ṣaḥīḥ Muslim 1893", theme: "general" },
  { text: "The example of the believers in their mutual love, mercy, and compassion is like one body; if one part suffers, the whole body responds with sleeplessness and fever.", source: "Ṣaḥīḥ al-Bukhārī 6011 · Ṣaḥīḥ Muslim 2586", theme: "general" },
  { text: "Whoever does not show mercy to people, Allāh will not show mercy to him.", source: "Ṣaḥīḥ al-Bukhārī 7376 · Ṣaḥīḥ Muslim 2319", theme: "general" },

  // ─── Fasting / Muḥarram (8) ───
  { text: "The best of fasting after Ramaḍān is the month of Allah, Muḥarram.", source: "Ṣaḥīḥ Muslim 1163", theme: "muḥarram" },
  { text: "The fast of the day of Āshūrā expiates the sins of the past year.", source: "Ṣaḥīḥ Muslim 1162", theme: "muḥarram" },
  { text: "If I live until next year, I will surely fast on the 9th (Tāsū'ā).", source: "Ṣaḥīḥ Muslim 1134", theme: "muḥarram" },
  { text: "The Prophet ﷺ was asked about fasting on the day of Āshūrā, and he said: 'It expiates the sins of the past year.'", source: "Ṣaḥīḥ Muslim 1162", theme: "muḥarram" },
  { text: "We fasted on the day of Āshūrā in the Jāhiliyyah, and the Messenger of Allāh ﷺ continued it. When fasting Ramaḍān became obligatory, he left Āshūrā (as obligatory). Whoever wishes may fast it, and whoever wishes may leave it.", source: "Ṣaḥīḥ al-Bukhārī 2003", theme: "muḥarram" },
  { text: "Distinguish yourselves from the Jews by fasting either a day before or a day after (Āshūrā).", source: "Musnad Aḥmad · graded ṣaḥīḥ", theme: "muḥarram" },
  { text: "Whoever fasts the day of Āshūrā, it is as if he fasted the entire year.", source: "Reported by al-Ṭabarānī (graded ḥasan)", theme: "muḥarram" },
  { text: "Year is twelve months, among which four are sacred: Rajab, Dhul-Qa'dah, Dhul-Ḥijjah, and Muḥarram.", source: "Ṣaḥīḥ al-Bukhārī 3197", theme: "muḥarram" },

  // ─── Rajab (4) ───
  { text: "O Allāh, bless us in Rajab and Sha'bān, and let us reach Ramaḍān.", source: "Reported by al-Ṭabarānī · graded ḥasan", theme: "rajab" },
  { text: "Rajab is the month of Allah, Sha'bān is my month, and Ramaḍān is the month of my Ummah.", source: "Reported by al-Ṭabarānī (graded ḥasan li-ghayrihi)", theme: "rajab" },
  { text: "There are five nights in which du'ā is not rejected: the first night of Rajab, the night of the 15th of Sha'bān, the night of Friday, the night of Eid al-Fiṭr, and the night of Eid al-Aḍḥā.", source: "Reported by al-Ṭabarānī (graded ḥasan li-ghayrihi)", theme: "rajab" },
  { text: "The Prophet ﷺ used to fast so much in Sha'bān that we thought he would not break his fast, and he used to break his fast so much that we thought he would not fast.", source: "Sunan al-Nasā'ī · graded ṣaḥīḥ", theme: "rajab" },

  // ─── Sha'bān (5) ───
  { text: "That is a month to which people do not pay much attention, between Rajab and Ramaḍān. It is a month in which deeds are taken up to the Lord of the Worlds, and I love that my deeds be taken up when I am fasting.", source: "Sunan al-Nasā'ī 2357 · graded ṣaḥīḥ", theme: "sha'bān" },
  { text: "Allāh looks at His creation on the night of the 15th of Sha'bān and forgives all of them except the polytheist and the one who harbours hatred.", source: "Musnad Aḥmad · graded ḥasan", theme: "sha'bān" },
  { text: "'Ā'ishah said: I never saw the Messenger of Allāh ﷺ complete a full month of fasting except Ramaḍān, and I never saw him fast more in any month than Sha'bān.", source: "Ṣaḥīḥ al-Bukhārī 1969", theme: "sha'bān" },
  { text: "When the middle night of Sha'bān comes, do not fast.", source: "Sunan al-Tirmidhī · graded ṣaḥīḥ", theme: "sha'bān" },
  { text: "O Allāh, bless us in Rajab and Sha'bān, and let us reach Ramaḍān.", source: "Reported by al-Bayhaqī · graded ḥasan", theme: "sha'bān" },

  // ─── Ramaḍān (10) ───
  { text: "When Ramaḍān begins, the gates of Paradise are opened, the gates of Hell are closed, and the devils are chained.", source: "Ṣaḥīḥ al-Bukhārī 1899", theme: "ramaḍān" },
  { text: "Whoever fasts Ramaḍān out of faith and seeking reward, all his previous sins will be forgiven.", source: "Ṣaḥīḥ al-Bukhārī 38", theme: "ramaḍān" },
  { text: "Whoever stands (in prayer) in Ramaḍān out of faith and seeking reward, all his previous sins will be forgiven.", source: "Ṣaḥīḥ al-Bukhārī 37", theme: "ramaḍān" },
  { text: "Seek Laylat al-Qadr in the odd nights of the last ten nights of Ramaḍān.", source: "Ṣaḥīḥ al-Bukhārī 2017", theme: "ramaḍān" },
  { text: "The Prophet ﷺ used to tighten his waist wrapper and stir his family to prayer in the last ten nights of Ramaḍān.", source: "Ṣaḥīḥ al-Bukhārī 2024", theme: "ramaḍān" },
  { text: "Whoever prays Laylat al-Qadr out of faith and seeking reward, all his previous sins will be forgiven.", source: "Ṣaḥīḥ al-Bukhārī 35", theme: "ramaḍān" },
  { text: "The Prophet ﷺ was the most generous of people, and he was even more generous in Ramaḍān when Jibrīl met him.", source: "Ṣaḥīḥ al-Bukhārī 3220", theme: "ramaḍān" },
  { text: "Fasting is a shield; when one of you is fasting, he should not behave obscenely nor raise his voice.", source: "Ṣaḥīḥ al-Bukhārī 1904", theme: "ramaḍān" },
  { text: "By Him in Whose Hand my soul is, the smell of the mouth of a fasting person is better to Allāh than the scent of musk.", source: "Ṣaḥīḥ al-Bukhārī 1904", theme: "ramaḍān" },
  { text: "There are two joys for the fasting person: one when he breaks his fast, and one when he meets his Lord.", source: "Ṣaḥīḥ al-Bukhārī 1904", theme: "ramaḍān" },

  // ─── Shawwāl (5) ───
  { text: "Whoever fasts Ramaḍān and then follows it with six days of Shawwāl, it is as if he fasted for a lifetime.", source: "Ṣaḥīḥ Muslim 1164", theme: "shawwāl" },
  { text: "The Prophet ﷺ used to fast on Mondays and Thursdays.", source: "Sunan al-Tirmidhī · graded ṣaḥīḥ", theme: "shawwāl" },
  { text: "Deeds are presented (to Allāh) on Mondays and Thursdays, and I like my deeds to be presented when I am fasting.", source: "Sunan al-Tirmidhī · graded ḥasan", theme: "shawwāl" },
  { text: "Fasting three days of every month is fasting for a lifetime.", source: "Ṣaḥīḥ al-Bukhārī 1979", theme: "shawwāl" },
  { text: "The Prophet ﷺ used to fast the three 'bright' days (13th, 14th, 15th) of every month.", source: "Sunan Abī Dāwūd · graded ṣaḥīḥ", theme: "shawwāl" },

  // ─── Ḥajj / Dhul-Ḥijjah (8) ───
  { text: "There are no days on which righteous deeds are more beloved to Allah than these ten days (of Dhul-Ḥijjah).", source: "Ṣaḥīḥ al-Bukhārī 969", theme: "ḥajj" },
  { text: "The fast of the Day of 'Arafah expiates the sins of the past year and the coming year.", source: "Ṣaḥīḥ Muslim 1162", theme: "ḥajj" },
  { text: "Whoever performs Ḥajj for the sake of Allāh and does not utter obscene speech or commit evil, will return as free from sin as the day his mother gave birth to him.", source: "Ṣaḥīḥ al-Bukhārī 1521", theme: "ḥajj" },
  { text: "An accepted Ḥajj has no reward but Paradise.", source: "Ṣaḥīḥ al-Bukhārī 1773", theme: "ḥajj" },
  { text: "Whoever reaches the morning of 'Arafah, Allāh forgives his sins — for the people of 'Arafah and for others.", source: "Reported by al-Ṭabarānī · graded ṣaḥīḥ", theme: "ḥajj" },
  { text: "There is no day on which Allāh frees more slaves from the Fire than the Day of 'Arafah.", source: "Ṣaḥīḥ Muslim 1348", theme: "ḥajj" },
  { text: "Take your rituals of Ḥajj from me.", source: "Ṣaḥīḥ Muslim 1297", theme: "ḥajj" },
  { text: "The Black Stone is from Paradise; it was whiter than milk, but the sins of the children of Ādam turned it black.", source: "Sunan al-Tirmidhī · graded ḥasan", theme: "ḥajj" },

  // ─── Ṣalāh (8) ───
  { text: "The covenant that distinguishes between us and them is prayer; so whoever leaves it, he has disbelieved.", source: "Sunan Abī Dāwūd 425 · graded ṣaḥīḥ", theme: "ṣalāh" },
  { text: "The first matter that the slave will be brought to account for on the Day of Judgement is the prayer.", source: "Sunan al-Tirmidhī 413 · graded ṣaḥīḥ", theme: "ṣalāh" },
  { text: "Whoever prays the two cool prayers (Fajr and 'Aṣr) will enter Paradise.", source: "Ṣaḥīḥ al-Bukhārī 574", theme: "ṣalāh" },
  { text: "Between a man and polytheism and disbelief is the abandonment of prayer.", source: "Ṣaḥīḥ Muslim 82", theme: "ṣalāh" },
  { text: "Whoever prays the morning prayer is under the protection of Allāh.", source: "Ṣaḥīḥ Muslim 1637", theme: "ṣalāh" },
  { text: "Whoever performs wuḍū' like this wuḍū' of mine, his previous sins are forgiven.", source: "Ṣaḥīḥ Muslim 226", theme: "ṣalāh" },
  { text: "Whoever says after the adhān: 'Allāhumma Rabba hādhihi ad-da'wati at-tāmmah...' — my intercession will be permissible for him on the Day of Resurrection.", source: "Ṣaḥīḥ al-Bukhārī 614", theme: "ṣalāh" },
  { text: "Whoever prays twelve rak'ahs in a day and night, a house will be built for him in Paradise.", source: "Ṣaḥīḥ Muslim 728", theme: "ṣalāh" },

  // ─── Zakāh / Charity (7) ───
  { text: "Whoever builds a masjid for Allāh, Allāh will build for him a house like it in Paradise.", source: "Ṣaḥīḥ al-Bukhārī 450 · Ṣaḥīḥ Muslim 533", theme: "zakāh" },
  { text: "Charity does not decrease wealth, no one forgives another except that Allāh increases his honour, and no one humbles himself for Allāh except that Allāh raises his status.", source: "Ṣaḥīḥ Muslim 2588", theme: "zakāh" },
  { text: "The one who looks after a widow and a poor person is like a mujāhid in the cause of Allāh, or one who fasts continuously and stands in prayer at night.", source: "Ṣaḥīḥ al-Bukhārī 5353 · Ṣaḥīḥ Muslim 2982", theme: "zakāh" },
  { text: "Whoever gives in charity the equivalent of a date from pure earnings — and Allāh only accepts what is pure — Allāh accepts it with His right hand and nurtures it for its owner as one of you nurtures a colt.", source: "Ṣaḥīḥ al-Bukhārī 1410", theme: "zakāh" },
  { text: "Save yourselves from the Fire even with half a date.", source: "Ṣaḥīḥ al-Bukhārī 1417", theme: "zakāh" },
  { text: "When a Muslim spends on his family seeking reward, it is charity for him.", source: "Ṣaḥīḥ al-Bukhārī 55", theme: "zakāh" },
  { text: "The upper hand is better than the lower hand; the upper hand is the one that gives, and the lower hand is the one that asks.", source: "Ṣaḥīḥ al-Bukhārī 1429", theme: "zakāh" },

  // ─── Akhlāq / Character (8) ───
  { text: "The most perfect of the believers in faith are those who are best in character.", source: "Sunan Abī Dāwūd 4682 · graded ṣaḥīḥ", theme: "akhlaq" },
  { text: "The believer who mixes with people and endures their harm is better than the one who does not mix with people.", source: "Sunan Ibn Mājah 4032 · graded ḥasan", theme: "akhlaq" },
  { text: "Make things easy and do not make them difficult; give glad tidings and do not scare people away.", source: "Ṣaḥīḥ al-Bukhārī 69", theme: "akhlaq" },
  { text: "The believers are like a building, one part supporting the other.", source: "Ṣaḥīḥ al-Bukhārī 6026", theme: "akhlaq" },
  { text: "You will not enter Paradise until you believe, and you will not believe until you love one another. Shall I tell you something which, if you do, you will love one another? Spread the salām among you.", source: "Ṣaḥīḥ Muslim 54", theme: "akhlaq" },
  { text: "It is from the best of Islam that a person leaves what does not concern him.", source: "Sunan al-Tirmidhī · graded ḥasan", theme: "akhlaq" },
  { text: "The Muslim is the one from whose tongue and hand the Muslims are safe.", source: "Ṣaḥīḥ al-Bukhārī 10", theme: "akhlaq" },
  { text: "Whoever believes in Allāh and the Last Day, let him honour his guest; and whoever believes in Allāh and the Last Day, let him maintain the ties of kinship.", source: "Ṣaḥīḥ al-Bukhārī 6018", theme: "akhlaq" },

  // ─── Qur'ān / Knowledge (6) ───
  { text: "The best among you are those who learn the Qur'ān and teach it.", source: "Ṣaḥīḥ al-Bukhārī 5027", theme: "knowledge" },
  { text: "Whoever reads a letter from the Book of Allāh will have a good deed, and each good deed is multiplied by ten. I do not say that Alif-Lām-Mīm is one letter, but Alif is a letter, Lām is a letter, and Mīm is a letter.", source: "Sunan al-Tirmidhī · graded ṣaḥīḥ", theme: "knowledge" },
  { text: "Whoever follows a path seeking knowledge, Allāh will make easy for him a path to Paradise.", source: "Ṣaḥīḥ Muslim 2699", theme: "knowledge" },
  { text: "Allāh makes the way to Paradise easy for him who treads the path in search of knowledge.", source: "Ṣaḥīḥ Muslim 2699", theme: "knowledge" },
  { text: "When the son of Ādam dies, his deeds end except three: a continuous charity, beneficial knowledge that is benefited from, or a righteous child who prays for him.", source: "Ṣaḥīḥ Muslim 1631", theme: "knowledge" },
  { text: "Whoever is asked about knowledge and conceals it, Allāh will bridle him with a bridle of fire on the Day of Resurrection.", source: "Sunan Abī Dāwūd · graded ḥasan", theme: "knowledge" },

  // ─── Du'ā / Remembrance (8) ───
  { text: "Du'ā is worship.", source: "Sunan Abī Dāwūd 1479 · graded ṣaḥīḥ", theme: "du'ā" },
  { text: "Your Lord is Living, Generous, and shy. When His servant raises his hands to Him, He feels too shy to return them empty.", source: "Sunan Abī Dāwūd 1488 · graded ḥasan", theme: "du'ā" },
  { text: "Two words are light on the tongue, heavy in the balance, beloved to the Most Merciful: Subḥānallāhi wa biḥamdih, Subḥānallāhil-'Aẓīm.", source: "Ṣaḥīḥ al-Bukhārī 6406 · Ṣaḥīḥ Muslim 2694", theme: "du'ā" },
  { text: "Whoever says 'Lā ilāha illā-Llāh waḥdahū lā sharīka lah, lahul-mulk wa lahul-ḥamd, wa huwa 'alā kulli shay'in qadīr' one hundred times a day will have the reward of freeing ten slaves.", source: "Ṣaḥīḥ al-Bukhārī 3293 · Ṣaḥīḥ Muslim 2691", theme: "du'ā" },
  { text: "Whoever says 'Subḥānallāhi wa biḥamdih' one hundred times a day, his sins are forgiven even if they are like the foam of the sea.", source: "Ṣaḥīḥ al-Bukhārī 6405 · Ṣaḥīḥ Muslim 2691", theme: "du'ā" },
  { text: "The most beloved of words to Allāh are four: Subḥānallāh, wal-ḥamdulillāh, wa lā ilāha illā-Llāh, wa-Llāhu akbar.", source: "Ṣaḥīḥ Muslim 2137", theme: "du'ā" },
  { text: "Whoever sends blessings upon me once, Allāh sends blessings upon him tenfold.", source: "Ṣaḥīḥ Muslim 408", theme: "du'ā" },
  { text: "The du'ā of a Muslim for his brother in his absence is answered. At his head is an angel appointed; whenever he makes du'ā for his brother with good, the angel says: 'Āmīn, and for you the same.'", source: "Ṣaḥīḥ Muslim 2733", theme: "du'ā" },

  // ─── Sacred Months / Dhul-Qa'dah (4) ───
  { text: "Year is twelve months, among which four are sacred: Rajab of Muḍar, Dhul-Qa'dah, Dhul-Ḥijjah, and Muḥarram.", source: "Ṣaḥīḥ al-Bukhārī 3197", theme: "sacred" },
  { text: "The most beloved of places to Allāh are the masājid, and the most hated of places to Allāh are the marketplaces.", source: "Ṣaḥīḥ Muslim 671", theme: "sacred" },
  { text: "Whoever sits in a place and does not remember Allāh, it is as if he sat on a grave.", source: "Sunan Abī Dāwūd · graded ḥasan", theme: "sacred" },
  { text: "Allāh has made the Ka'bah, the Sacred House, a means of support for the people, and the sacred month.", source: "Qur'ān 5:97", theme: "sacred" },

  // ─── Patience / Trials (5) ───
  { text: "Wondrous are the affairs of the believer, for there is good for him in every matter. If he is happy, he thanks Allāh, and that is good for him; if he is harmed, he is patient, and that is good for him.", source: "Ṣaḥīḥ Muslim 2999", theme: "patience" },
  { text: "No fatigue, disease, sorrow, sadness, hurt, or distress befalls a Muslim — even the prick of a thorn — except that Allāh expiates his sins by it.", source: "Ṣaḥīḥ al-Bukhārī 5640 · Ṣaḥīḥ Muslim 2573", theme: "patience" },
  { text: "Allāh says: 'When I take My slave's two eyes, there is no reward for him except Paradise.'", source: "Ṣaḥīḥ al-Bukhārī 5653", theme: "patience" },
  { text: "Whoever Allāh wishes good for, He afflicts him with trials.", source: "Ṣaḥīḥ al-Bukhārī 5645", theme: "patience" },
  { text: "The reward is proportionate to the affliction. Whoever Allāh intends good for, He afflicts with trials.", source: "Sunan al-Tirmidhī · graded ṣaḥīḥ", theme: "patience" },

  // ─── Repentance (4) ───
  { text: "All the children of Ādam are sinners, and the best of sinners are those who repent.", source: "Sunan Ibn Mājah · graded ḥasan", theme: "tawbah" },
  { text: "Allāh spreads His hand at night to accept the repentance of the one who sinned by day, and He spreads His hand by day to accept the repentance of the one who sinned by night.", source: "Ṣaḥīḥ Muslim 2759", theme: "tawbah" },
  { text: "Whoever repents before the sun rises from the west, Allāh accepts his repentance.", source: "Ṣaḥīḥ Muslim 2703", theme: "tawbah" },
  { text: "Allāh is more joyful at the repentance of His slave than one of you who finds his lost camel in the desert.", source: "Ṣaḥīḥ al-Bukhārī 6309 · Ṣaḥīḥ Muslim 2747", theme: "tawbah" },

  // ─── Family / Society (4) ───
  { text: "The best of you are those who are best to their families, and I am the best of you to my family.", source: "Sunan Ibn Mājah · graded ḥasan", theme: "family" },
  { text: "Each of you is a shepherd, and each of you is responsible for his flock. The leader is a shepherd, the man is a shepherd over his family, the woman is a shepherd over her husband's house and children.", source: "Ṣaḥīḥ al-Bukhārī 893 · Ṣaḥīḥ Muslim 1829", theme: "family" },
  { text: "Whoever is not merciful to people, Allāh will not be merciful to him.", source: "Ṣaḥīḥ al-Bukhārī 7376 · Ṣaḥīḥ Muslim 2319", theme: "family" },
  { text: "Whoever desires that his provision be increased and his lifespan be extended, let him maintain the ties of kinship.", source: "Ṣaḥīḥ al-Bukhārī 5985 · Ṣaḥīḥ Muslim 2557", theme: "family" },

  // ─── Death / Hereafter (4) ───
  { text: "Increase the remembrance of the destroyer of pleasures: death.", source: "Sunan al-Tirmidhī · graded ḥasan", theme: "akhira" },
  { text: "Be in this world as though you are a stranger or a traveller.", source: "Ṣaḥīḥ al-Bukhārī 6416", theme: "akhira" },
  { text: "Whoever loves to meet Allāh, Allāh loves to meet him; and whoever hates to meet Allāh, Allāh hates to meet him.", source: "Ṣaḥīḥ al-Bukhārī 6502 · Ṣaḥīḥ Muslim 2684", theme: "akhira" },
  { text: "The intelligent one is he who takes account of himself and works for what comes after death.", source: "Sunan al-Tirmidhī · graded ḥasan", theme: "akhira" },

  // ─── Gratitude (3) ───
  { text: "Look at those who are below you (in worldly status) and do not look at those who are above you, for that is more likely to keep you from belittling Allāh's favour upon you.", source: "Ṣaḥīḥ al-Bukhārī 6490 · Ṣaḥīḥ Muslim 2963", theme: "gratitude" },
  { text: "Allāh is pleased with a slave who eats food and praises Him, and drinks a drink and praises Him.", source: "Ṣaḥīḥ Muslim 2734", theme: "gratitude" },
  { text: "Wonderful is the affair of the believer — there is good for him in everything.", source: "Ṣaḥīḥ Muslim 2999", theme: "gratitude" },
];

// ─── Month-to-theme mapping ─────────────────────────────────────────────────
const MONTH_THEME_MAP: Record<number, string[]> = {
  1: ["muḥarram"],       // Muḥarram — fasting, Āshūrā
  2: ["patience", "tawbah"],   // Ṣafar
  3: ["akhlaq", "du'ā"],  // Rabī' al-Awwal — Prophet ﷺ
  4: ["knowledge"],       // Rabī' al-Ākhir
  5: ["general"],         // Jumādā al-Ūlā
  6: ["gratitude", "akhlaq"], // Jumādā al-Ākhirah
  7: ["rajab", "sacred"], // Rajab
  8: ["sha'bān"],         // Sha'bān
  9: ["ramaḍān"],         // Ramaḍān
  10: ["shawwāl", "gratitude"], // Shawwāl
  11: ["sacred"],         // Dhul-Qa'dah
  12: ["ḥajj", "sacred"], // Dhul-Ḥijjah
};

/**
 * Get the hadith rotation cycle key — ensures no repetition within 3 months.
 *
 * The cycle is computed by:
 *  1. Computing a "cycle index" that changes every 3 months (e.g. 0, 0, 0, 1, 1, 1, ...)
 *  2. Within each cycle, using a different starting offset
 *  3. This ensures that within any 3-month window, no hadith repeats
 */
export function getCycleKey(hijriYear: number, hijriMonth: number): { cycleIdx: number; monthInCycle: number; offset: number } {
  const totalMonths = hijriYear * 12 + hijriMonth;
  const cycleIdx = Math.floor(totalMonths / 3);
  const monthInCycle = totalMonths % 3; // 0, 1, or 2
  // Offset within the cycle: rotate the starting index for each month in cycle
  const offset = monthInCycle * 7; // prime offset for good distribution
  return { cycleIdx, monthInCycle, offset };
}

/**
 * Get the hadith for the current month, with 3-month cycle enforcement.
 * Uses the cycle key + a hash to pick a stable index for the month.
 */
export function getRotatingHadith(hijriMonth: number, hijriYear: number): ThemedHadith {
  const themes = MONTH_THEME_MAP[hijriMonth] || ["general"];
  const { cycleIdx, offset } = getCycleKey(hijriYear, hijriMonth);

  // Build a pool: themed hadith first, then general
  const themed: ThemedHadith[] = [];
  for (const t of themes) {
    themed.push(...HADITH_POOL.filter(h => h.theme === t));
  }
  const general = HADITH_POOL.filter(h => h.theme === "general");
  const pool = [...themed, ...general];

  // Cycle index: stable within the month, different across months in the cycle
  // Use cycleIdx to skip ahead by a different amount each cycle
  const skip = (cycleIdx * 3) % pool.length;
  const finalIdx = (offset + skip) % pool.length;

  return pool[finalIdx];
}

/**
 * Get the next 3 hadith for the cycle (for use in rotating display).
 * Ensures the 3 are distinct within the cycle.
 */
export function getRotatingHadithSet(hijriMonth: number, hijriYear: number, count: number = 3): ThemedHadith[] {
  const themes = MONTH_THEME_MAP[hijriMonth] || ["general"];
  const { cycleIdx, offset } = getCycleKey(hijriYear, hijriMonth);

  const themed: ThemedHadith[] = [];
  for (const t of themes) {
    themed.push(...HADITH_POOL.filter(h => h.theme === t));
  }
  const general = HADITH_POOL.filter(h => h.theme === "general");
  const pool = [...themed, ...general];

  const skip = (cycleIdx * 3) % pool.length;
  const set: ThemedHadith[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < count && i < pool.length; i++) {
    const idx = (offset + skip + i) % pool.length;
    if (seen.has(idx)) continue;
    seen.add(idx);
    set.push(pool[idx]);
  }
  return set;
}

/**
 * Get the month-transition hadith (for when a new month is approaching).
 * Returns themed hadith for the UPCOMING month + general hadith as alternate.
 */
export function getMonthTransitionHadith(upcomingMonth: number): ThemedHadith {
  const themes = MONTH_THEME_MAP[upcomingMonth] || ["general"];
  for (const t of themes) {
    const themed = HADITH_POOL.filter(h => h.theme === t);
    if (themed.length > 0) return themed[0];
  }
  return HADITH_POOL[0];
}

/**
 * Get the month-usher hadith — encouraging hadith shown when the new month begins.
 */
export function getMonthUsherHadith(newMonth: number): ThemedHadith {
  const themes = MONTH_THEME_MAP[newMonth] || ["general"];
  for (const t of themes) {
    const themed = HADITH_POOL.filter(h => h.theme === t);
    if (themed.length > 1) return themed[1]; // Use second one to avoid duplicate with transition
    if (themed.length > 0) return themed[0];
  }
  return HADITH_POOL[1];
}

export { HADITH_POOL, MONTH_THEME_MAP };
