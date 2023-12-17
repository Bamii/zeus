import { NextFunction, Request, Response } from 'express'

export default (schema: { safeParse: Function }) => {
    return (req: Request, res: Response, next: NextFunction) => {
        console.log(req.body)
        const result = schema.safeParse(req.body)
        if (!result.success)
            return res
                .status(400)
                .json({
                    status: 'error',
                    message: `a validation error occured. `,
                    data: result.error.format(),
                })

        return next()
    }
}
