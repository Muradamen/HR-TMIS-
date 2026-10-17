from django import forms
from .models import LegalTrader, InformalTrader
from apps.locations.models import Woreda, Kebele

class LegalTraderForm(forms.ModelForm):
    class Meta:
        model = LegalTrader
        fields = [
            'trade_name', 'owner_full_name', 'tin', 'trade_registration_number',
            'trade_license_number', 'gender', 'age', 'region', 'woreda', 'kebele',
            'house_number_plot_id', 'business_sector', 'trade_scale',
            'business_ownership_type', 'issuing_institution', 'date_of_issuance',
            'data_entered_by', 'remarks', 'officer_signature', 'verification_date',
        ]
        widgets = {
            'trade_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Jugol Heritage Spices & Coffee Trading'}),
            'owner_full_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Ahmedin Ibrahim Mohammed'}),
            'tin': forms.TextInput(attrs={'class': 'form-control font-monospace', 'placeholder': 'e.g. 0054891243'}),
            'trade_registration_number': forms.TextInput(attrs={'class': 'form-control font-monospace', 'placeholder': 'e.g. HR-TR-2026-0842'}),
            'trade_license_number': forms.TextInput(attrs={'class': 'form-control font-monospace', 'placeholder': 'e.g. HR-LIC-2026-11940'}),
            'gender': forms.Select(attrs={'class': 'form-select'}),
            'age': forms.NumberInput(attrs={'class': 'form-control', 'min': 18}),
            'region': forms.TextInput(attrs={'class': 'form-control', 'readonly': 'readonly'}),
            'woreda': forms.Select(attrs={'class': 'form-select', 'id': 'id_woreda'}),
            'kebele': forms.Select(attrs={'class': 'form-select', 'id': 'id_kebele'}),
            'house_number_plot_id': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. H-421/Jugol'}),
            'business_sector': forms.Select(attrs={'class': 'form-select'}),
            'trade_scale': forms.Select(attrs={'class': 'form-select'}),
            'business_ownership_type': forms.Select(attrs={'class': 'form-select'}),
            'issuing_institution': forms.TextInput(attrs={'class': 'form-control'}),
            'date_of_issuance': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'data_entered_by': forms.TextInput(attrs={'class': 'form-control'}),
            'remarks': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'officer_signature': forms.TextInput(attrs={'class': 'form-control'}),
            'verification_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }

    def clean(self):
        cleaned_data = super().clean()
        woreda = cleaned_data.get('woreda')
        kebele = cleaned_data.get('kebele')
        # STRICT LOCATION INTEGRITY VALIDATION
        if woreda and kebele and kebele.woreda_id != woreda.id:
            raise forms.ValidationError(
                f"Location Integrity Error: Kebele '{kebele.name}' does not belong to Woreda '{woreda.name}'."
            )
        return cleaned_data


class InformalTraderForm(forms.ModelForm):
    class Meta:
        model = InformalTrader
        fields = [
            'full_name', 'gender', 'age', 'national_id_resident_id', 'phone_number',
            'region', 'woreda', 'kebele', 'specific_location_market_area',
            'nature_of_trade_activity', 'estimated_capital_assets',
            'reason_for_operating_informally', 'enumerator_data_collector_name',
            'date_of_assessment', 'formalization_status_recommendation',
        ]
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Fatuma Ahmed Ali'}),
            'gender': forms.Select(attrs={'class': 'form-select'}),
            'age': forms.NumberInput(attrs={'class': 'form-control', 'min': 16}),
            'national_id_resident_id': forms.TextInput(attrs={'class': 'form-control font-monospace', 'placeholder': 'e.g. ET-HR-2024-99812'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. +251 91 523 4819'}),
            'region': forms.TextInput(attrs={'class': 'form-control', 'readonly': 'readonly'}),
            'woreda': forms.Select(attrs={'class': 'form-select', 'id': 'id_woreda'}),
            'kebele': forms.Select(attrs={'class': 'form-select', 'id': 'id_kebele'}),
            'specific_location_market_area': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Gidir Magala (Open Vegetable Section)'}),
            'nature_of_trade_activity': forms.Select(attrs={'class': 'form-select'}),
            'estimated_capital_assets': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'reason_for_operating_informally': forms.Select(attrs={'class': 'form-select'}),
            'enumerator_data_collector_name': forms.TextInput(attrs={'class': 'form-control'}),
            'date_of_assessment': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'formalization_status_recommendation': forms.Select(attrs={'class': 'form-select'}),
        }

    def clean(self):
        cleaned_data = super().clean()
        woreda = cleaned_data.get('woreda')
        kebele = cleaned_data.get('kebele')
        # STRICT LOCATION INTEGRITY VALIDATION
        if woreda and kebele and kebele.woreda_id != woreda.id:
            raise forms.ValidationError(
                f"Location Integrity Error: Kebele '{kebele.name}' does not belong to Woreda '{woreda.name}'."
            )
        return cleaned_data
