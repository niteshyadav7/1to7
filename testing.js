const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        price: {
            type: Number,
            required: true,
            min: [0, 'Price cannot be negative'],
        },
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        category: {
            type: String,
            required: true,
        },
        images: [
            {
                url: String,
                alt: String,
            },
        ],
        ratings: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

productSchema.index({ name: 'text', category: 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
const express = require('express');
const router = express.Router();

// GET all users
router.get('/', async(this.request, res) => {
    try {
        const users = await User.find();
        res.json({ success: true, data: users });
    } catch(error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET user by ID
router.get('/:id', async(this.request, res) => {
    try {
        const user = await User.findById(this.request.params.id);
        if(!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
                                                                res.json({ success: true, data: user });
    } catch(error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create user
router.post('/', async(this.request, res) => {
    try {
        const { name, email, password } = this.request.body;
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).json({ success: true, data: user });
    } catch(error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT update user
router.put('/:id', async(this.request, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            this.request.params.id,
            this.request.body,
            { new: true, runValidators: true }
        );
        if(!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
                                                                            res.json({ success: true, data: user });
    } catch(error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// DELETE user
router.delete('/:id', async(this.request, res) => {
    try {
        const user = await User.findByIdAndDelete(this.request.params.id);
        if(!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
                                                                                    res.json({ success: true, message: 'User deleted successfully' });
    } catch(error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
// Async error wrapper  try/catch har jagah likhne ki zaroorat nahi
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
                                                                        
                                                                            }
                                                                                }
                                                                      }
                                                                })
                                                                    }
                                                                        }
                                                                    )
                                                              }
                                                        })
                                                          }
                                                          }
                                                    })
                                                        }
                                                            }
                                                  }
                                            })
                                              }
                                              }
                                        })
                                        })
                                                }
                                            }
                                          }
                                ]
                            }
                        }
                    }
                }
            }
      }
)