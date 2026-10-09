from django.db import models

class Region(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Woreda(models.Model):
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='woredas', null=True, blank=True)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Kebele(models.Model):
    woreda = models.ForeignKey(Woreda, on_delete=models.CASCADE, related_name='kebeles')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('woreda', 'code')

    def __str__(self):
        return f"{self.name} - {self.woreda.name}"
