from django import forms

from .models import Trader, LegalTrader, InformalTrader


class TraderForm(forms.ModelForm):
    class Meta:
        model = Trader
        fields = [
            "trader_type",
        ]

        widgets = {
            "trader_type": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
        }


class LegalTraderForm(forms.ModelForm):
    class Meta:
        model = LegalTrader

        fields = [
            "trade_name",
            "owner_full_name",
            "tin",
            "trade_registration_number",
            "gender",
            "age",
            "region",
            "woreda",
            "kebele",
            "house_number_plot_id",
            "business_sector",
            "trade_scale",
            "business_ownership_type",
            "issuing_institution",
            "date_of_issuance",
            "data_entered_by",
            "remarks",
            "officer_signature",
            "verification_date",
        ]

        widgets = {
            "trade_name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Trade Name / Company Name",
                }
            ),
            "owner_full_name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Owner Full Name",
                }
            ),
            "tin": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "TIN",
                }
            ),
            "trade_registration_number": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Trade Registration Number",
                }
            ),
            "gender": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "age": forms.NumberInput(
                attrs={
                    "class": "form-control",
                    "min": 1,
                }
            ),
            "region": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "value": "Harari Region",
                }
            ),
            "woreda": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "kebele": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "house_number_plot_id": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "House Number / Plot ID",
                }
            ),
            "business_sector": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "trade_scale": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "business_ownership_type": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "issuing_institution": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Issuing Institution",
                }
            ),
            "date_of_issuance": forms.DateInput(
                attrs={
                    "class": "form-control",
                    "type": "date",
                }
            ),
            "data_entered_by": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "User ID / Officer Name",
                }
            ),
            "remarks": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 3,
                    "placeholder": "Additional Notes / Remarks",
                }
            ),
            "officer_signature": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Officer Signature",
                }
            ),
            "verification_date": forms.DateInput(
                attrs={
                    "class": "form-control",
                    "type": "date",
                }
            ),
        }


class InformalTraderForm(forms.ModelForm):
    class Meta:
        model = InformalTrader

        fields = [
            "full_name",
            "gender",
            "age",
            "national_id_resident_id",
            "phone_number",
            "region",
            "woreda",
            "kebele",
            "specific_location_market_area",
            "nature_of_trade_activity",
            "estimated_capital_assets",
            "reason_for_operating_informally",
            "enumerator_data_collector_name",
            "date_of_assessment",
            "formalization_status_recommendation",
        ]

        widgets = {
            "full_name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Full Name",
                }
            ),
            "gender": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "age": forms.NumberInput(
                attrs={
                    "class": "form-control",
                    "min": 1,
                }
            ),
            "national_id_resident_id": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "National ID / Resident ID No",
                }
            ),
            "phone_number": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Phone Number",
                }
            ),
            "region": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "value": "Harari Region",
                }
            ),
            "woreda": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "kebele": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "specific_location_market_area": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Specific Location / Market Area",
                }
            ),
            "nature_of_trade_activity": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "estimated_capital_assets": forms.NumberInput(
                attrs={
                    "class": "form-control",
                    "step": "0.01",
                    "min": "0",
                }
            ),
            "reason_for_operating_informally": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
            "enumerator_data_collector_name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Enumerator / Data Collector Name",
                }
            ),
            "date_of_assessment": forms.DateInput(
                attrs={
                    "class": "form-control",
                    "type": "date",
                }
            ),
            "formalization_status_recommendation": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
        }
