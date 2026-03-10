# Industrial monitoring

Mostly all machines are having PLC controller and in some cases an external computer attached to it. We need to implement simply monitoring solution that collects information form the machines directly and stores in factory ERP such as time when machine is running or not, how many parts were produced, any alrms present, and any other machine-specific metric.

In cases where direct integration is not possible consider
- edge gateway near machine, ex. optical sensor to count parts, microphone or acoustic signature analysis, vibration sensor to detect activity
- computer vision, camera counting parts leaving a conveyor