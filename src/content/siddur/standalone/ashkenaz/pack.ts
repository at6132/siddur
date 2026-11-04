import type { StandaloneOfflinePack, StandaloneSectionKey } from '../packTypes';
import { MINCHA_ASHKENAZ_POLICY } from '../../mincha/ashkenaz/policy';
import { STANDALONE_OFFLINE_META } from './meta';
import { STANDALONE_ASHKENAZ_RAW } from './raw';

function sec(key: StandaloneSectionKey) {
  const raw = STANDALONE_ASHKENAZ_RAW[key];
  if (!raw?.hebrew) return undefined;
  return { key, hebrew: raw.hebrew, english: raw.english ?? '' };
}

export const STANDALONE_ASHKENAZ_PACK: StandaloneOfflinePack = {
  policy: MINCHA_ASHKENAZ_POLICY,
  attribution: STANDALONE_OFFLINE_META.attribution,
  sections: {
    asher_yatzar: sec('asher_yatzar'),
    netilas_yadayim: sec('netilas_yadayim'),
    modeh_ani: sec('modeh_ani'),
    birchos_hatorah: sec('birchos_hatorah'),
    tefilas_haderech: sec('tefilas_haderech'),
    birchas_hamazon: sec('birchas_hamazon'),
    al_hamichya: sec('al_hamichya'),
    krias_shema_al_hamita: sec('krias_shema_al_hamita'),
  },
};
