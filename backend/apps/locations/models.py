from django.db import models

class Region(models.Model):
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'ht_regions'
        ordering = ['name']

    def __str__(self):
        return self.name

class Woreda(models.Model):
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='woredas')
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=30, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'ht_woredas'
        ordering = ['id']
        unique_together = [['region', 'name']]

    def __str__(self):
        return self.name

class Kebele(models.Model):
    woreda = models.ForeignKey(Woreda, on_delete=models.CASCADE, related_name='kebeles')
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=30, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'ht_kebeles'
        ordering = ['id']
        unique_together = [['woreda', 'name']]

    def __str__(self):
        return f"{self.name} ({self.woreda.name})"
