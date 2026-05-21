import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRouter from './routes/auth';
import portsRouter from './routes/ports';
import shipmentsRouter from './routes/shipments';
import billingsRouter from './routes/billings';
import adminRouter from './routes/admin';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/ports', portsRouter);
app.use('/shipments', shipmentsRouter);
app.use('/billings', billingsRouter);
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
