from django.core.management.base import BaseCommand
from apps.locations.models import Region, Woreda, Kebele

HARARI_WOREDAS_DATA = [
    {
        'name': 'Amir Nur',
        'code': 'AN-01',
        'kebeles': [
            {'name': 'Kebele 01 (Jenila)', 'code': 'AN-K01'},
            {'name': 'Kebele 02 (Deker)', 'code': 'AN-K02'},
            {'name': 'Kebele 03 (Suktat)', 'code': 'AN-K03'},
        ]
    },
    {
        'name': 'Abadir',
        'code': 'AB-02',
        'kebeles': [
            {'name': 'Kebele 04 (Gedir Shingir)', 'code': 'AB-K04'},
            {'name': 'Kebele 05 (Feres Magala)', 'code': 'AB-K05'},
        ]
    },
    {
        'name': 'Shenkor',
        'code': 'SH-03',
        'kebeles': [
            {'name': 'Kebele 06 (Shenkor Center)', 'code': 'SH-K06'},
            {'name': 'Kebele 07 (Bete-Mekdes)', 'code': 'SH-K07'},
        ]
    },
    {
        'name': "Jin'Eala",
        'code': 'JN-04',
        'kebeles': [
            {'name': "Kebele 08 (Jin'Eala Upper)", 'code': 'JN-K08'},
            {'name': "Kebele 09 (Jin'Eala Lower)", 'code': 'JN-K09'},
        ]
    },
    {
        'name': 'Hakim',
        'code': 'HK-06',
        'kebeles': [
            {'name': 'Kebele 12 (Hakim Mountain Gate)', 'code': 'HK-K12'},
            {'name': 'Kebele 13 (Arategna)', 'code': 'HK-K13'},
        ]
    },
    {
        'name': 'Sofi',
        'code': 'SF-07',
        'kebeles': [
            {'name': 'Kebele 14 (Sofi Rural Commercial Center)', 'code': 'SF-K14'},
            {'name': 'Kebele 15 (Aw-Umer)', 'code': 'SF-K15'},
        ]
    },
    {
        'name': 'Erer',
        'code': 'ER-08',
        'kebeles': [
            {'name': 'Kebele 16 (Erer Guda)', 'code': 'ER-K16'},
            {'name': 'Kebele 17 (Erer Tiya)', 'code': 'ER-K17'},
        ]
    },
    {
        'name': 'Dire Teyara',
        'code': 'DT-09',
        'kebeles': [
            {'name': 'Kebele 18 (Hasengey)', 'code': 'DT-K18'},
            {'name': 'Kebele 19 (Qile)', 'code': 'DT-K19'},
        ]
    },
]

class Command(BaseCommand):
    help = 'Seeds Harari Region administrative Woredas and Kebeles without duplication.'

    def handle(self, *args, **options):
        region, _ = Region.objects.get_or_create(
            name='Harari Region',
            defaults={'code': 'HR-01', 'is_active': True}
        )
        self.stdout.write(f"Region: {region.name}")

        # Aboker is not part of the current eight-Woreda reference list. Keep historical
        # trader links intact while removing it from active location choices.
        Woreda.objects.filter(name__iexact='Aboker').update(is_active=False)

        woredas_created = 0
        kebeles_created = 0

        for w_data in HARARI_WOREDAS_DATA:
            woreda, created = Woreda.objects.get_or_create(
                region=region,
                code=w_data['code'],
                defaults={'name': w_data['name'], 'is_active': True}
            )
            if created:
                woredas_created += 1
            elif woreda.name != w_data['name'] or not woreda.is_active:
                woreda.name = w_data['name']
                woreda.is_active = True
                woreda.save(update_fields=['name', 'is_active'])

            for k_data in w_data['kebeles']:
                _, k_created = Kebele.objects.get_or_create(
                    woreda=woreda,
                    code=k_data['code'],
                    defaults={
                        'name': k_data['name'],
                        'is_active': True
                    }
                )
                if k_created:
                    kebeles_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {len(HARARI_WOREDAS_DATA)} Harari Woredas "
                f"({woredas_created} new) and Kebeles ({kebeles_created} new)."
            )
        )
