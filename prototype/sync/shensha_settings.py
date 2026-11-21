"""Validation for synchronized Shensha settings; mirrors the version 1 client format."""
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

STEMS = list('甲乙丙丁戊己庚辛壬癸')
BRANCHES = list('子丑寅卯辰巳午未申酉戌亥')
PAIRS = [STEMS[i % 10] + BRANCHES[i % 12] for i in range(60)]
IDS = 'tiande yuede tianyi wenchang lushen yima huagai jiangxing jinyu tianyi-medical taohua yangren jiesha zaisha kongwang shie yinyang tianluodiwang custom1 custom2 custom3'.split()


def validate_settings(value):
    if not isinstance(value, dict) or type(value.get('version')) is not int or value['version'] != 1:
        raise ValueError('Invalid settings version')
    zone = value.get('zone')
    if not isinstance(zone, str) or len(zone) > 100:
        raise ValueError('Invalid time zone')
    if zone:
        try:
            ZoneInfo(zone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError('Invalid time zone') from None
    birth = value.get('birth', dict.fromkeys(('year', 'month', 'day', 'hour'), ''))
    if not isinstance(birth, dict) or any(birth.get(k) not in ['', *PAIRS] for k in ('year', 'month', 'day', 'hour')):
        raise ValueError('Invalid birth pillars')
    selections = value.get('selections')
    if not isinstance(selections, dict):
        raise ValueError('Invalid selections')
    result = {}
    for key in IDS:
        rule = selections.get(key)
        targets = rule.get('targets') if isinstance(rule, dict) else None
        allowed = BRANCHES
        if key in ('tiande', 'yuede'):
            allowed = STEMS + BRANCHES
        elif key == 'zaisha' or key.startswith('custom'):
            allowed = STEMS + BRANCHES + PAIRS
        elif key == 'shie':
            allowed = ['甲辰','乙巳','丙申','丁亥','戊戌','己丑','庚辰','辛巳','壬申','癸亥']
        elif key == 'yinyang':
            allowed = ['丙子','丁丑','戊寅','辛卯','壬辰','癸巳','丙午','丁未','戊申','辛酉','壬戌','癸亥']
        elif key == 'tianluodiwang':
            allowed = ['戌','亥','辰','巳']
        if not isinstance(rule, dict) or type(rule.get('enabled')) is not bool or not isinstance(targets, list) or len(targets) > 82 or any(t not in allowed for t in targets) or (rule['enabled'] and not targets):
            raise ValueError('Invalid targets')
        result[key] = {'enabled': rule['enabled'], 'targets': list(dict.fromkeys(targets))}
        for field, choices in [('origin', ('ming', 'yun', 'unclassified')), ('effect', ('positive', 'negative', 'neutral'))]:
            if field in rule:
                if rule[field] not in choices:
                    raise ValueError('Invalid strength or effect')
                result[key][field] = rule[field]
    return {'version': 1, 'zone': zone, 'birth': {k: birth[k] for k in ('year', 'month', 'day', 'hour')}, 'selections': result}
