from django.db import models


class Woreda(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Woreda'
        verbose_name_plural = 'Woredas'

    def __str__(self):
        return self.name


class Kebele(models.Model):
    woreda = models.ForeignKey(
        Woreda,
        on_delete=models.PROTECT,
        related_name='kebeles',
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['woreda__name', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['woreda', 'name'],
                name='unique_kebele_name_per_woreda',
            ),
            models.UniqueConstraint(
                fields=['woreda', 'code'],
                name='unique_kebele_code_per_woreda',
            ),
        ]
        verbose_name = 'Kebele'
        verbose_name_plural = 'Kebeles'

    def __str__(self):
        return f'{self.woreda.name} - {self.name}'
