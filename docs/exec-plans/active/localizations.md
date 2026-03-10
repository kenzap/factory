# Localizations

There is a need for a feature that can re create localizations. This can be achieved in the following steps: 
- implement new terminal command like npm run localization:export
- that method should generate new localization in json format, simple key value format, with default string values stored all around the code.
- Functions that should be screened for include: __html('example string'), __attr('example string'), __('example string'), 
alternatively on the backend same functions look like __html(locale, 'example string'), __attr(locale, 'example string'), __(locale, 'example string')
- then by running somthing like localization:to:lt we should be able to localize all strings via open ai or athropic API into selected language.
- finally all localizations can be imported to the database into locale ref key but without overwriting those values that are already present.
- consider partial localizations only of those values that are not yet in the system
- store everything in docs/generated/localizations